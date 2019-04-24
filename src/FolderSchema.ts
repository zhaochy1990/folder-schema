import Debug from 'debug';
import * as fs from 'fs-extra';
import * as path from 'path';

import { SchemaNode, ROOT_DIR, PARENT_DIR } from './SchemaNode';

const debug = Debug('folder-schema:FolderSchema');


export default class FolderSchema {
  public static async parse(folderpath: string) {
    debug('parse folder: %s', folderpath);
    const isAbsolute = path.isAbsolute(folderpath);

    let targetDir = folderpath;
    if (!isAbsolute) {
      const cwd = process.cwd();
      debug('input is relative path, cwd:%s', cwd);
      targetDir = path.resolve(cwd, folderpath);
    }

    // using lstat, follow symbolic link
    const handler = await fs.lstat(targetDir);
    const isDir = handler.isDirectory();
    debug('Target Dir:%s is Dir: %s', targetDir, isDir);

    const schema: SchemaNode = new SchemaNode(targetDir, handler);;

    if (handler.isFile()) {
      return schema;
    }

    if (!isDir) {
      return schema;
    }

    const children = await fs.readdir(targetDir);

    debug('children: %j', children);

    const promises = children.map((child: string) => this.parse(path.resolve(targetDir, child)));

    const childrenSchemas = await Promise.all(promises);

    schema.addChildren(childrenSchemas);

    return schema;
  }

  public static rootDir(baseDir?: string) {
    let absPath: string = baseDir || ROOT_DIR;
    if (!path.isAbsolute(absPath)) {
      absPath = path.join(ROOT_DIR, absPath);
    }
    return new SchemaNode(absPath, 'directory');
  }

  public static dir(dirName: string) {
    return new SchemaNode(path.join(PARENT_DIR, dirName), 'directory');
  }

  public static file(fileName: string) {
    return new SchemaNode(path.join(PARENT_DIR, fileName), 'file');
  }

  /**
   * validate a folder with a schema definition
   * 
   * @param folderpath the folder to validate
   * @param schema the folder schema
   */
  public static validate(folderpath: string, schema: SchemaNode) {
    const targetSchema = this.parse(folderpath);
    // TODO:
  }
}
