import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

import { PACKAGE_NAME } from './index.js';
import { GET_TOOL, SEARCH_TOOL, SERVER_METADATA_TOOL } from './server.js';
import { getServerMetadata } from './serverMetadata.js';

function isTextContent(value: unknown): value is { readonly text: string; readonly type: 'text' } {
  if (typeof value !== 'object' || value === null) return false;

  const content = value as Record<string, unknown>;
  return content.type === 'text' && typeof content.text === 'string';
}

function getFirstContent(value: unknown): unknown {
  return Array.isArray(value) ? (value[0] as unknown) : undefined;
}

void describe('MCP stdio transport', () => {
  void test('completes the MCP stdio integration gate', async () => {
    const cliPath = fileURLToPath(new URL('./cli.js', import.meta.url));
    const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
    const identity = getServerMetadata();
    const transport = new StdioClientTransport({
      args: [cliPath],
      command: process.execPath,
      cwd: packageRoot,
      stderr: 'pipe',
    });
    const client = new Client({ name: 'mcp-server-test-client', version: '0.1.0' }, { capabilities: {} });

    try {
      await client.connect(transport);

      assert.deepEqual(client.getServerVersion(), {
        description: identity.description,
        name: PACKAGE_NAME,
        version: identity.version,
      });
      assert.deepEqual(await client.ping(), {});

      const tools = await client.listTools();
      assert.deepEqual(
        tools.tools.map((tool) => tool.name),
        [SERVER_METADATA_TOOL, SEARCH_TOOL, GET_TOOL],
      );

      const result = await client.callTool({ arguments: {}, name: SERVER_METADATA_TOOL });
      assert.equal(result.isError, undefined);

      const firstContent = getFirstContent(result.content);
      if (!isTextContent(firstContent)) throw new Error('The version tool did not return text content');
      assert.deepEqual(JSON.parse(firstContent.text) as unknown, identity);

      const search = await client.callTool({ arguments: { domain: 'race', query: 'human' }, name: SEARCH_TOOL });
      const searchContent = getFirstContent(search.content);
      if (!isTextContent(searchContent)) throw new Error('The search tool did not return text content');
      assert.ok((JSON.parse(searchContent.text) as readonly unknown[]).length > 0);

      const backgroundSearch = await client.callTool({
        arguments: { domain: 'background', query: 'acolyte' },
        name: SEARCH_TOOL,
      });
      const backgroundContent = getFirstContent(backgroundSearch.content);
      if (!isTextContent(backgroundContent)) throw new Error('The background search tool did not return text content');
      assert.equal(
        (JSON.parse(backgroundContent.text) as readonly { readonly id?: unknown }[])[0]?.id,
        'background/acolyte/phb',
      );

      const optionalFeatureSearch = await client.callTool({
        arguments: { domain: 'optionalfeature', query: 'agonizing blast' },
        name: SEARCH_TOOL,
      });
      const optionalFeatureContent = getFirstContent(optionalFeatureSearch.content);
      if (!isTextContent(optionalFeatureContent))
        throw new Error('The optional feature search tool did not return text content');
      assert.equal(
        (JSON.parse(optionalFeatureContent.text) as readonly { readonly id?: unknown }[])[0]?.id,
        'optionalfeature/agonizing%20blast/phb',
      );

      const facility = await client.callTool({ arguments: { id: 'facility/ancient%20altar/rhw' }, name: GET_TOOL });
      const facilityContent = getFirstContent(facility.content);
      if (!isTextContent(facilityContent)) throw new Error('The facility get tool did not return text content');
      assert.equal((JSON.parse(facilityContent.text) as { readonly id?: unknown }).id, 'facility/ancient%20altar/rhw');

      const spellSearch = await client.callTool({
        arguments: { domain: 'spell', query: 'acid splash' },
        name: SEARCH_TOOL,
      });
      const spellContent = getFirstContent(spellSearch.content);
      if (!isTextContent(spellContent)) throw new Error('The spell search tool did not return text content');
      assert.equal(
        (JSON.parse(spellContent.text) as readonly { readonly id?: unknown }[])[0]?.id,
        'spell/acid%20splash/phb',
      );

      const action = await client.callTool({
        arguments: { domain: 'action', name: 'Attack', source: 'PHB' },
        name: GET_TOOL,
      });
      const actionContent = getFirstContent(action.content);
      if (!isTextContent(actionContent)) throw new Error('The action get tool did not return text content');
      assert.equal((JSON.parse(actionContent.text) as { readonly id?: unknown }).id, 'action/attack/phb');

      const condition = await client.callTool({
        arguments: { domain: 'condition', name: 'Blinded', source: 'PHB' },
        name: GET_TOOL,
      });
      const conditionContent = getFirstContent(condition.content);
      if (!isTextContent(conditionContent)) throw new Error('The condition get tool did not return text content');
      assert.equal((JSON.parse(conditionContent.text) as { readonly id?: unknown }).id, 'condition/blinded/phb');

      const language = await client.callTool({
        arguments: { domain: 'language', name: 'Common', source: 'PHB' },
        name: GET_TOOL,
      });
      const languageContent = getFirstContent(language.content);
      if (!isTextContent(languageContent)) throw new Error('The language get tool did not return text content');
      assert.equal((JSON.parse(languageContent.text) as { readonly id?: unknown }).id, 'language/common/phb');

      const object = await client.callTool({
        arguments: { domain: 'object', name: 'Ballista', source: 'DMG' },
        name: GET_TOOL,
      });
      const objectContent = getFirstContent(object.content);
      if (!isTextContent(objectContent)) throw new Error('The object get tool did not return text content');
      assert.equal((JSON.parse(objectContent.text) as { readonly id?: unknown }).id, 'object/ballista/dmg');

      const trap = await client.callTool({
        arguments: { domain: 'trap', name: 'Falling Net', source: 'DMG' },
        name: GET_TOOL,
      });
      const trapContent = getFirstContent(trap.content);
      if (!isTextContent(trapContent)) throw new Error('The trap get tool did not return text content');
      assert.equal((JSON.parse(trapContent.text) as { readonly id?: unknown }).id, 'trap/falling%20net/dmg');

      const deity = await client.callTool({
        arguments: { id: 'deity/norse/aegir/phb' },
        name: GET_TOOL,
      });
      const deityContent = getFirstContent(deity.content);
      if (!isTextContent(deityContent)) throw new Error('The deity get tool did not return text content');
      assert.equal((JSON.parse(deityContent.text) as { readonly id?: unknown }).id, 'deity/norse/aegir/phb');

      const table = await client.callTool({
        arguments: { domain: 'table', name: '2,500 gp Art Objects', source: 'PSX' },
        name: GET_TOOL,
      });
      const tableContent = getFirstContent(table.content);
      if (!isTextContent(tableContent)) throw new Error('The table get tool did not return text content');
      assert.equal(
        (JSON.parse(tableContent.text) as { readonly id?: unknown }).id,
        'table/2%2C500%20gp%20art%20objects/psx',
      );

      const monster = await client.callTool({
        arguments: { domain: 'monster', name: 'Aboleth', source: 'MM' },
        name: GET_TOOL,
      });
      const monsterContent = getFirstContent(monster.content);
      if (!isTextContent(monsterContent)) throw new Error('The monster get tool did not return text content');
      assert.equal((JSON.parse(monsterContent.text) as { readonly id?: unknown }).id, 'monster/aboleth/mm');

      const template = await client.callTool({
        arguments: { domain: 'monsterTemplate', name: 'Aarakocra', source: 'DMG' },
        name: GET_TOOL,
      });
      const templateContent = getFirstContent(template.content);
      if (!isTextContent(templateContent)) throw new Error('The monster template get tool did not return text content');
      assert.equal((JSON.parse(templateContent.text) as { readonly id?: unknown }).id, 'monstertemplate/aarakocra/dmg');

      const dragonMundaneItems = await client.callTool({
        arguments: {
          domain: 'lootDragonMundaneItemTable',
          name: 'Dragon Mundane Items',
          source: 'FTD',
        },
        name: GET_TOOL,
      });
      const dragonMundaneItemsContent = getFirstContent(dragonMundaneItems.content);
      if (!isTextContent(dragonMundaneItemsContent))
        throw new Error('The dragon mundane items get tool did not return text content');
      assert.equal(
        (JSON.parse(dragonMundaneItemsContent.text) as { readonly id?: unknown }).id,
        'lootdragonmundaneitemtable/ftd',
      );

      const equipmentGets = [
        [{ domain: 'item', name: 'Bag of Holding', source: 'DMG' }, 'item/bag%20of%20holding/dmg'],
        [{ domain: 'itemGroup', name: 'Arcane Focus', source: 'PHB' }, 'itemgroup/arcane%20focus/phb'],
        [{ domain: 'itemBase', name: 'Dagger', source: 'PHB' }, 'itembase/dagger/phb'],
        [{ abbreviation: 'A', domain: 'itemProperty', source: 'PHB' }, 'itemproperty/a/phb'],
        [{ domain: 'itemType', name: 'Melee Weapon', source: 'PHB' }, 'itemtype/melee%20weapon/phb'],
        [
          { domain: 'itemTypeAdditionalEntries', name: 'Gaming Set', source: 'XGE' },
          'itemtypeadditionalentries/gaming%20set/xge',
        ],
        [{ domain: 'itemEntry', name: 'Absorbing Tattoo', source: 'TCE' }, 'itementry/absorbing%20tattoo/tce'],
        [{ domain: 'itemMastery', name: 'Cleave', source: 'XPHB' }, 'itemmastery/cleave/xphb'],
        [{ domain: 'vehicle', name: 'Apparatus of Kwalish', source: 'DMG' }, 'vehicle/apparatus%20of%20kwalish/dmg'],
        [
          { domain: 'vehicleUpgrade', name: 'Acidic Bile Sprayer', source: 'BGDIA' },
          'vehicleupgrade/acidic%20bile%20sprayer/bgdia',
        ],
      ] as const;
      for (const [arguments_, id] of equipmentGets) {
        const equipment = await client.callTool({ arguments: arguments_, name: GET_TOOL });
        const equipmentContent = getFirstContent(equipment.content);
        if (!isTextContent(equipmentContent)) throw new Error('The equipment get tool did not return text content');
        assert.equal((JSON.parse(equipmentContent.text) as { readonly id?: unknown }).id, id);
      }

      const get = await client.callTool({ arguments: { id: 'race/human/phb' }, name: GET_TOOL });
      const getContent = getFirstContent(get.content);
      if (!isTextContent(getContent)) throw new Error('The get tool did not return text content');
      assert.equal((JSON.parse(getContent.text) as { readonly id?: unknown }).id, 'race/human/phb');

      const missingGet = await client.callTool({ arguments: { id: 'race/not-real/phb' }, name: GET_TOOL });
      const missingGetContent = getFirstContent(missingGet.content);
      if (!isTextContent(missingGetContent)) throw new Error('The missing get tool result did not return text content');
      assert.equal(missingGetContent.text, 'null');

      const invalidGet = await client.callTool({ arguments: { domain: 'race' }, name: GET_TOOL });
      assert.equal(invalidGet.isError, true);
    } finally {
      await client.close();
    }
  });
});
