import {Stats} from 'fs';
import * as path from 'path';
import Debug from 'debug';

const debug = Debug('folder-schema:SchemaNode');

export type NodeType = 'file' | 'directory' | 'link';

export const PARENT_DIR = '${parent_dir}';
export const ROOT_DIR = '${root_dir}';

export interface CompareResult {
  success: boolean;
  reason?: string;
}

export interface CompareOptions {
  strict?: boolean;
}

function checkArrayElementUnique(arr: SchemaNode[]) {
  const map: { [key: string]: SchemaNode } = {};

  for (let i = 0, size = arr.length; i < size; i++) {
    if (map[arr[i].name + arr[i].type]) {
      throw new Error(`Duplicated ${arr[i].type} ${arr[i].name} found`);
    }
    map[arr[i].name + arr[i].type] = arr[i];
  }
}

export class SchemaNode {
  public abspath: string;
  public type: NodeType;
  public name: string;
  public parentDir: string;
  public children: SchemaNode[];

  private ignoreChildren: boolean;
  private _optional: boolean;

  constructor(abspath: string, handler: Stats | NodeType) {
    this.abspath = abspath;
    this.name = path.basename(abspath);
    this.parentDir = path.dirname(abspath);

    if (typeof handler === 'string') {
      this.type = handler;
    } else {
      if (handler.isDirectory()) {
        this.type = 'directory';
      } else if (handler.isFile()) {
        this.type = 'file';
      } else if (handler.isSymbolicLink()) {
        this.type = 'link';
      } else {
        throw new Error('Unsupported type');
      }
    }

    this.ignoreChildren = false;
    this._optional = false;
    this.children = [];
    debug('%s of type %s', this.name, this.type);
  }

  public toJSON(): any {
    return {
      type: this.type,
      abspath: this.abspath,
      name: this.name,
      children: this.children.map((child: SchemaNode) => child.toJSON()),
    };
  }

  public addChild(child: SchemaNode) {
    if (this.type !== 'directory') {
      return;
    }
    this.children.push(child);
    return this;
  }

  public addChildren(children: SchemaNode[]) {
    if (this.type !== 'directory') {
      return;
    }
    checkArrayElementUnique(children);
    debug('add children %j', children);
    children.forEach((child: SchemaNode) => {
      child.abspath = path.join(this.abspath, child.name);
      child.parentDir = this.abspath;
      const childChildren = child.children;
      child.children = [];
      child.addChildren(childChildren);
    });
    this.children = this.children.concat(children);
    return this;
  }

  /**
   * By withAnyChildren() the validation will skip the children of this folder
   */
  public withAnyChildren() {
    this.ignoreChildren = true;
    return this;
  }

  public optional() {
    this._optional = true;
    return this;
  }

  public updateRootDir(rootDir: string) {
    if (this.parentDir.includes(ROOT_DIR)) {
      debug('update root dir for %s', this.name);
      let newRootDir = rootDir;
      if (!path.isAbsolute(rootDir)) {
        newRootDir = path.resolve(process.cwd(), newRootDir);
      }
      this.parentDir = this.parentDir.replace(ROOT_DIR, rootDir);
      this.abspath = this.abspath.replace(ROOT_DIR, rootDir);
      this.children.forEach((child) => {
        child.updateRootDir(newRootDir);
      })
    }
  }

  /**
   * Check if schema matched expected.
   *
   * @param expectedSchema
   * @param options
   */
  public equals(expectedSchema: SchemaNode, options?: CompareOptions): CompareResult {
    debug('check if \n%j\nequals\n%j\n', this.toJSON(), expectedSchema.toJSON());

    if (this.name !== expectedSchema.name) {
      return {
        success: false,
        reason: `${this.name} does not match ${expectedSchema.name}`,
      };
    }

    if (this.abspath !== expectedSchema.abspath) {
      return {
        success: false,
        reason: `${this.abspath} does not match ${expectedSchema.abspath}`,
      }
    }

    if (this.type !== expectedSchema.type) {
      return {
        success: false,
        reason: `${this.type} does not match ${expectedSchema.type}`
      }
    }

    if (expectedSchema.ignoreChildren) {
      debug('%s ignore children', this.abspath);
      return {success: true};
    }
    let unvisited = Array.from(expectedSchema.children);
    for (const child of this.children) {
      const tChild = expectedSchema.children.find(c => c.name === child.name);
      if (!tChild) {
        if (options && options.strict === false) {
          continue;
        }
        return {
          success: false,
          reason: `Unexpected ${child.type} ${child.abspath}`,
        }
      }
      const isMatch = child.equals(tChild, options);
      if (!isMatch.success) {
        return isMatch;
      }
      // remove item from unvisited
      const idx = unvisited.findIndex(c => c.name === child.name);
      unvisited.splice(idx, 1);
    }
    // remove optional items
    unvisited = unvisited.filter(r => !r._optional);

    if (unvisited.length === 0) {
      return {success: true};
    }
    // can not found some folder/file from file system
    const reasons = unvisited.map(r => `Can not find ${r.type} ${r.abspath}`);
    return {
      success: false,
      reason: reasons.join(', '),
    };
  }
}
