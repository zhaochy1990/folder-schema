const FolderSchema = require('../dist/index.js');

const debug = require('debug')('folder-schema:test');


async function main() {
  // const schema = await FolderSchema.parse('../node_modules');

  // const jsonSchema = schema.toJSON();

  // debug('%O', jsonSchema);

  /**
   * src/
   *   |
   *   \folder1
   *       |
   *       \file1.1
   *       \file1.2
   *   \folder2
   *   \file1
   *   \file2
   */

  const schemaDef = FolderSchema.rootDir('testDir').addChildren([
    FolderSchema.dir('folder1').addChildren([
      FolderSchema.file('file1.1'),
      FolderSchema.file('file1.2'),
    ]),
    FolderSchema.dir('folder2').addChildren([
      FolderSchema.file('file2.1'),
    ]),
    FolderSchema.dir('folder3').withAnyChildren(),
    FolderSchema.file('file1'),
    FolderSchema.file('file2'),
    FolderSchema.file('file4').optional(),
  ]);

  debug('%j', schemaDef.toJSON());

  const res = await FolderSchema.validate('./testDir', schemaDef, { strict: false });

  console.log(res);
}

main();
