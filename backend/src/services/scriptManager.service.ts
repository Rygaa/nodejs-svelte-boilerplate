import * as fs from "fs";
import * as path from "path";
import { logger } from "./logger.service";

export interface ScriptConfig {
  name: string;
  filename: string;
  description: string;
  autoRun: boolean;
  waitTime: number; // milliseconds
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  runCount: number;
  params: Record<string, any>;
}

export interface ScriptsConfiguration {
  scripts: ScriptConfig[];
}

export class ScriptManagerService {
  private scriptsConfigPath: string;
  private scriptsDirectory: string;
  private config: ScriptsConfiguration;
  private autoRunIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.scriptsConfigPath = path.join(process.cwd(), "data", "scripts.json");
    this.scriptsDirectory = path.join(process.cwd(), "src", "scripts");
    this.config = this.loadConfiguration();
  }

  /**
   * Load scripts configuration from JSON file
   */
  private loadConfiguration(): ScriptsConfiguration {
    try {
      if (fs.existsSync(this.scriptsConfigPath)) {
        const rawData = fs.readFileSync(this.scriptsConfigPath, "utf-8");
        return JSON.parse(rawData);
      }
    } catch (error) {
      logger.error({
        message: "Failed to load scripts configuration",
        source: "ScriptManagerService",
        data: { error: error instanceof Error ? error.message : "Unknown error" },
      });
    }

    // Return default configuration if file doesn't exist or is invalid
    return { scripts: [] };
  }

  /**
   * Save scripts configuration to JSON file
   */
  private saveConfiguration(): void {
    try {
      fs.writeFileSync(this.scriptsConfigPath, JSON.stringify(this.config, null, 2));
      logger.info({
        message: "Scripts configuration saved successfully",
        source: "ScriptManagerService",
      });
    } catch (error) {
      logger.error({
        message: "Failed to save scripts configuration",
        source: "ScriptManagerService",
        data: { error: error instanceof Error ? error.message : "Unknown error" },
      });
    }
  }

  /**
   * Discover and populate scripts from the scripts directory
   */
  public async discoverScripts(): Promise<void> {
    try {
      if (!fs.existsSync(this.scriptsDirectory)) {
        logger.warning({
          message: "Scripts directory does not exist",
          source: "ScriptManagerService",
          data: { directory: this.scriptsDirectory },
        });
        return;
      }

      const files = fs.readdirSync(this.scriptsDirectory);
      const scriptFiles = files.filter((file) => file.endsWith(".ts") && !file.endsWith(".d.ts"));

      logger.info({
        message: `Found ${scriptFiles.length} script files`,
        source: "ScriptManagerService",
        data: { files: scriptFiles },
      });

      // Update existing scripts and add new ones
      for (const file of scriptFiles) {
        const scriptName = path.basename(file, ".ts");
        const existingScript = this.config.scripts.find((s) => s.name === scriptName);

        if (!existingScript) {
          // Add new script with default configuration
          const newScript: ScriptConfig = {
            name: scriptName,
            filename: file,
            description: `Auto-discovered script: ${scriptName}`,
            autoRun: false,
            waitTime: 3600000, // 1 hour default
            enabled: true,
            lastRun: null,
            nextRun: null,
            runCount: 0,
            params: {},
          };

          this.config.scripts.push(newScript);
          logger.info({
            message: `Added new script configuration`,
            source: "ScriptManagerService",
            data: { scriptName },
          });
        } else {
          // Update filename in case it changed
          existingScript.filename = file;
        }
      }

      // Remove configurations for scripts that no longer exist
      this.config.scripts = this.config.scripts.filter((script) => {
        const exists = scriptFiles.includes(script.filename);
        if (!exists) {
          logger.info({
            message: `Removed configuration for missing script`,
            source: "ScriptManagerService",
            data: { scriptName: script.name },
          });
        }
        return exists;
      });

      this.saveConfiguration();
    } catch (error) {
      logger.error({
        message: "Failed to discover scripts",
        source: "ScriptManagerService",
        data: { error: error instanceof Error ? error.message : "Unknown error" },
      });
    }
  }

  /**
   * Get all script configurations
   */
  public getScripts(): ScriptConfig[] {
    return this.config.scripts;
  }

  /**
   * Update script configuration
   */
  public async updateScript(scriptName: string, updates: Partial<ScriptConfig>): Promise<boolean> {
    const script = this.config.scripts.find((s) => s.name === scriptName);
    if (!script) {
      return false;
    }

    // Update properties
    Object.assign(script, updates);

    // Recalculate next run time if autoRun or waitTime changed
    if (updates.autoRun !== undefined || updates.waitTime !== undefined) {
      if (script.autoRun && script.enabled) {
        script.nextRun = new Date(Date.now() + script.waitTime).toISOString();
      } else {
        script.nextRun = null;
      }
    }

    this.saveConfiguration();

    // Restart auto-run if needed
    await this.setupAutoRun(script);

    logger.info({
      message: `Updated script configuration`,
      source: "ScriptManagerService",
      data: { scriptName, updates },
    });

    return true;
  }

  /**
   * Setup auto-run for all enabled scripts
   */
  public async startAutoRun(): Promise<void> {
    const autoRunPromises = this.config.scripts
      .filter((script) => script.autoRun && script.enabled)
      .map(async (script) => {
        await this.setupAutoRun(script);
      });

    await Promise.all(autoRunPromises);

    logger.info({
      message: "Auto-run started for enabled scripts",
      source: "ScriptManagerService",
    });
  }

  /**
   * Setup auto-run for a specific script
   */
  private async setupAutoRun(script: ScriptConfig): Promise<void> {
    // Clear existing interval
    const existingInterval = this.autoRunIntervals.get(script.name);
    if (existingInterval) {
      clearInterval(existingInterval);
      this.autoRunIntervals.delete(script.name);
    }

    // Setup new interval if auto-run is enabled
    if (script.autoRun && script.enabled) {
      // Execute immediately first
      await this.executeScript(script);

      // Then setup interval for subsequent runs
      const interval = setInterval(async () => {
        await this.executeScript(script);
      }, script.waitTime);

      this.autoRunIntervals.set(script.name, interval);

      // Set next run time
      script.nextRun = new Date(Date.now() + script.waitTime).toISOString();
      this.saveConfiguration();

      logger.info({
        message: `Setup auto-run for script`,
        source: "ScriptManagerService",
        data: {
          scriptName: script.name,
          waitTime: script.waitTime,
          nextRun: script.nextRun,
        },
      });
    }
  }

  /**
   * Execute a script
   */
  private async executeScript(script: ScriptConfig): Promise<void> {
    try {
      logger.info({
        message: `Executing script`,
        source: "ScriptManagerService",
        data: { scriptName: script.name },
      });

      // Dynamic import of the script
      const scriptPath = path.join(this.scriptsDirectory, script.filename);
      const scriptModule = await import(scriptPath);

      // Update last run and run count
      script.lastRun = new Date().toISOString();
      script.runCount++;

      // Calculate next run time
      if (script.autoRun && script.enabled) {
        script.nextRun = new Date(Date.now() + script.waitTime).toISOString();
      }

      this.saveConfiguration();

      // Execute the main function (assuming it's the default export or named function)
      const mainFunction = scriptModule.default || scriptModule[script.name];
      if (typeof mainFunction === "function") {
        await mainFunction(script.params);
      } else {
        throw new Error(`No executable function found in script ${script.name}`);
      }

      logger.success({
        message: `Script executed successfully`,
        source: "ScriptManagerService",
        data: { scriptName: script.name, runCount: script.runCount },
      });
    } catch (error) {
      logger.error({
        message: `Script execution failed`,
        source: "ScriptManagerService",
        data: {
          scriptName: script.name,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  /**
   * Stop auto-run for all scripts
   */
  public stopAutoRun(): void {
    this.autoRunIntervals.forEach((interval, scriptName) => {
      clearInterval(interval);
      logger.info({
        message: `Stopped auto-run for script`,
        source: "ScriptManagerService",
        data: { scriptName },
      });
    });
    this.autoRunIntervals.clear();
  }

  /**
   * Manual script execution
   */
  public async executeScriptManually(
    scriptName: string,
    params?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    const script = this.config.scripts.find((s) => s.name === scriptName);
    if (!script) {
      return { success: false, error: "Script not found" };
    }

    if (!script.enabled) {
      return { success: false, error: "Script is disabled" };
    }

    try {
      // Use provided params or default params
      const executeParams = params || script.params;

      // Create a temporary script config for execution
      const tempScript = { ...script, params: executeParams };
      await this.executeScript(tempScript);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Export singleton instance
export const scriptManager = new ScriptManagerService();
