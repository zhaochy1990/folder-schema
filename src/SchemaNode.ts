import { Stats } from "fs";
import * as path from 'path';
import Debug from 'debug';

const debug = Debug('folder-schema:SchemaNode');

export type NodeType = 'file' | 'directory' | 'link';

export class SchemaNode {
  public abspath: string;
  public type: NodeType;
  public name: string;
  public children: SchemaNode[];

  public handler: Stats;

  constructor(abspath: string, handler: Stats) {
    this.abspath = abspath;
    this.name = path.basename(abspath);

    this.handler = handler;
    this.children = [];

    if (handler.isDirectory()) {
      this.type = 'directory';
    } else if (handler.isFile()) {
      this.type = 'file';
    } else if (handler.isSymbolicLink()) {
      this.type = 'link';
    } else {
      throw new Error('Unsupported type');
    }
    debug('%s of type %s', this.name, this.type);
  }

  public toJSON(): any {
    return {
      type: this.type,
      abspath: this.abspath,
      name: this.name,
      // handler: this.handler,
      children: this.children.map((child: SchemaNode) => child.toJSON()),
    };
  }

  public addChild(child: SchemaNode) {
    this.children.push(child);
  }

  public addChildren(children: SchemaNode[]) {
    this.children = this.children.concat(children);
  }
}
