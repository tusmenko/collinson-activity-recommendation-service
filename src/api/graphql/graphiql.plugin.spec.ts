import { describe, expect, it } from 'vitest';

import { GraphiqlPlugin } from './graphiql.plugin';

async function landingPage(plugin: GraphiqlPlugin): Promise<string> {
  const listener = await plugin.serverWillStart();
  const page = await listener.renderLandingPage?.();
  return typeof page?.html === 'string' ? page.html : '';
}

describe('GraphiqlPlugin', () => {
  it('U-API-9 the landing page opens GraphiQL with the given tabs as defaultTabs', async () => {
    const html = await landingPage(new GraphiqlPlugin([{ query: '{ a }', variables: '{}' }]));

    expect(html).toContain('<script type="application/json" id="graphiql-tabs">');
    expect(html).toContain('[{"query":"{ a }","variables":"{}"}]');
    expect(html).toContain('defaultTabs');
    expect(html).toContain('https://unpkg.com/graphiql@3.8.3/graphiql.min.js');
  });

  it('U-API-9 a tab containing </script> cannot close the data block', async () => {
    const html = await landingPage(
      new GraphiqlPlugin([{ query: '# </script><script>alert(1)</script>', variables: '{}' }]),
    );

    expect(html).not.toContain('</script><script>alert(1)');
    expect(html).toContain('\\u003c/script>');
  });
});
