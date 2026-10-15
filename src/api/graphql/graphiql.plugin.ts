import type { ApolloServerPlugin, GraphQLServerListener } from '@apollo/server';

import { GRAPHIQL_ASSETS } from './graphql.const';
import type { GraphqlContext, GraphiqlTab } from './graphql.types';

// GraphiQL opened on the example operations, as Apollo's landing page: a browser GET on /graphql gets it, a GET or
// POST carrying a query still runs. Nest's `graphiql` option has no preset tabs, so it is off and this replaces it.
// The page is for reviewers; in production it would sit behind an auth proxy. The service sets no
// Content-Security-Policy, so the pinned CDN builds load.
export class GraphiqlPlugin implements ApolloServerPlugin<GraphqlContext> {
  private readonly html: string;

  constructor(tabs: readonly GraphiqlTab[]) {
    this.html = this.page(tabs);
  }

  serverWillStart(): Promise<GraphQLServerListener> {
    const { html } = this;
    return Promise.resolve({ renderLandingPage: () => Promise.resolve({ html }) });
  }

  // The tabs travel as JSON in a data block; escaping '<' keeps an operation's text from closing the script element.
  private page(tabs: readonly GraphiqlTab[]): string {
    const data = JSON.stringify(tabs).replaceAll('<', '\\u003c');
    const scripts = GRAPHIQL_ASSETS.scripts
      .map((src) => `<script crossorigin src="${src}"></script>`)
      .join('\n    ');
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Activity Ranking Service · GraphiQL</title>
    <style>body { margin: 0; } #graphiql { height: 100vh; }</style>
    <link rel="stylesheet" href="${GRAPHIQL_ASSETS.css}" />
  </head>
  <body>
    <div id="graphiql">Loading GraphiQL…</div>
    <script type="application/json" id="graphiql-tabs">${data}</script>
    ${scripts}
    <script>
      const defaultTabs = JSON.parse(document.getElementById('graphiql-tabs').textContent);
      ReactDOM.createRoot(document.getElementById('graphiql')).render(
        React.createElement(GraphiQL, {
          fetcher: GraphiQL.createFetcher({ url: '/graphql' }),
          defaultTabs,
          defaultEditorToolsVisibility: 'variables',
          shouldPersistHeaders: true,
        }),
      );
    </script>
  </body>
</html>
`;
  }
}
