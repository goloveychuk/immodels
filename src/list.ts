

import { ImmutableStruct } from './common';
import { List as IList } from 'immutable';
import { Types, getType } from 'tsruntime';
import { Deserializers } from './deserializers';
import {findTypeInTypesChain} from './utils';


export class List<V> extends ImmutableStruct<IList<V>> {
  protected readonly _data: IList<V>
  
  constructor(vals?: any[] | IList<V> | List<V>, typeFromProp?: Types.ReferenceType) {
    super()
    if (vals === undefined) {
      this._data = IList()
    } else if (IList.isList(vals)) {
      this._data = vals
    } else {
      if ((typeFromProp === undefined) && (getType(new.target) === undefined)) {
        this._data = IList(vals)
        return
      }
      const type = findTypeInTypesChain(typeFromProp, new.target, List)
      if (vals instanceof List) {
        vals = vals.toArray() //todo2: optimize (used in expertisePage.ts, at least)
      }
      this._data = IList(Deserializers.deserializeList(type.arguments[0], vals))
    }
  }
  toJS() {
    return this._data.toJS()
  }
  toJSON() {
    return this.toJS()
  }
  find(predicate: (value: V, key: number) => boolean) {
    return this._data.find(predicate)
  }
  findIndex(predicate: (value: V, key: number) => boolean) {
    return this._data.findIndex(predicate)
  }
  toArray() {
    return this._data.toArray()
  }

  delete(ind: number) {
    const newData = this._data.delete(ind)
    return this._createNew(newData)
  }
  
  [Symbol.iterator]() {
    return this._data[Symbol.iterator]()
  }
  map<R>(cb: (v: V, k: number) => R): List<R> {
    return new List(this._data.map(cb))
  }
  insert(index: number, value: V) {
    return new List(this._data.insert(index, value))
  }
  forEach(cb: (v: V, k: number) => any) {
    return this._data.forEach(cb)
  }
  filter(cb: (value: V, index: number) => boolean): this {
    return this._createNew(this._data.filter(cb))
  }
  isEmpty() {
    return this._data.isEmpty()
  }
  concat(collection: List<V>): List<V>{
    return new List(this._data.concat(collection._data))
  }
  join(separator?: string) {
    return this._data.join(separator)
  }
  push(...vals: V[]) {
    const newData = this._data.push(...vals)
    return this._createNew(newData)
  }
  get(ind: number) {
    return this._data.get(ind)
  }
  set(ind: number, val: V): this {
    const newData = this._data.set(ind, val)
    return this._createNew(newData)
  }
  slice(begin?: number, end?: number) {
    return  this._createNew(this._data.slice(begin, end))
  }
  last() {
    return this._data.last()
  }
  first() {
    return this._data.first()
  }
  get length() {
    return this._data.count()
  }
}
