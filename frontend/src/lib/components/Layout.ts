/**
 * Layout Components
 *
 * Usage example:
 * ```svelte
 * <script>
 *   import Layout from "../lib/components/Layout";
 * </script>
 *
 * <Layout.Page>
 *   <Layout.Header>
 *     <h1>Page Title</h1>
 *   </Layout.Header>
 *
 *   <Layout.Main>
 *     <Layout.Card>
 *       Content goes here
 *     </Layout.Card>
 *   </Layout.Main>
 * </Layout.Page>
 * ```
 */

import PageComponent from "./Layout/Page.svelte";
import HeaderComponent from "./Layout/Header.svelte";
import MainComponent from "./Layout/Main.svelte";
import ContainerComponent from "./Layout/Container.svelte";
import CardComponent from "./Layout/Card.svelte";

// Create a namespace object that supports dot notation
const Layout = {
  Page: PageComponent,
  Header: HeaderComponent,
  Main: MainComponent,
  Container: ContainerComponent,
  Card: CardComponent,
};

export default Layout;
export {
  PageComponent as Page,
  HeaderComponent as Header,
  MainComponent as Main,
  ContainerComponent as Container,
  CardComponent as Card,
};
