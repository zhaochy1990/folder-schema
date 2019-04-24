import { Stats } from "fs";
import * as path from 'path';
import Debug from 'debug';

const debug = Debug('folder-schema:SchemaNode');

export type NodeType = 'file' | 'directory' | 'link';

export const PARENT_DIR = '${parent_dir}';
export const ROOT_DIR = '${root_dir}';

export class SchemaNode {
  public abspath: string;
  public type: NodeType;
  public name: string;
  public parentDir: string;
  public children: SchemaNode[];

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
    children.forEach((child: SchemaNode) => {
      child.abspath = path.join(this.abspath, child.name);
      child.parentDir = this.abspath;
      child.addChildren(child.children);
    });
    this.children = this.children.concat(children);
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
}
