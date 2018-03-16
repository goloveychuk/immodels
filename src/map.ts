

import { ImmutableStruct, serializeIndexVal, IndexVal } from './common';
import { Map as IMap } from 'immutable';
import { Types, getType } from 'tsruntime';
import { Deserializers } from './deserializers';
import {findTypeInTypesChain} from './utils';


export class Map<K, V> extends ImmutableStruct<IMap<K, V>> {
  protected readonly _data: IMap<K, V>
  
  constructor(vals?: Object | IMap<K, V>, typeFromProp?: Types.ReferenceType) {
    super()
    if (vals === undefined) {
      this._data = IMap()
    } else if (IMap.isMap(vals)) {
      this._data = vals
    } else {
      if ((typeFromProp === undefined) && (getType(new.target) === undefined)) {
        this._data = IMap<K, V>(vals as any) //todo4:
        return
      }
      const type = findTypeInTypesChain(typeFromProp, new.target, Map)
      if (vals instanceof Map) {
        vals = vals.toJS()
      }
      this._data = IMap(Deserializers.deserializeMap(type.arguments[0], type.arguments[1], vals) as any) //todo4:
    }
  }
  toJS() {
    return this._data.toJS()
  }
  toJSON() {
    return this.toJS()
  }
  find(predicate: (value: V, key: K) => boolean) {
    return this._data.find(predicate)
  }
  toArray() {
    return this._data.toArray()
  }

  items() {
    return this._data.entrySeq()
  }

  delete(key: K) {
    const newData = this._data.delete(key)
    return this._createNew(newData)
  }
  
  [Symbol.iterator]() {
    return this._data[Symbol.iterator]()
  }
  map<R>(cb: (v: V, k: K) => R) {
    return new Map(this._data.map(cb))
  }
  forEach(cb: (v: V, k: K) => any) {
    return this._data.forEach(cb)
  }
  filter(cb: (value: V, index: K) => boolean): this {
    return this._createNew(this._data.filter(cb))
  }
  isEmpty() {
    return this._data.isEmpty()
  }
  join(separator?: string) {
    return this._data.join(separator)
  }
  get(key: K) {
    return this._data.get(key)
  }
  set(key: K, val: V): this {
    const newData = this._data.set(key, val)
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


export class IndexedMap<K extends IndexVal, V> extends Map<K, V> {
  get(k: K) {
    return super.get(this.serializeKey(k))
  }
  set(k: K, val: V) {
    const newData = this._data.set(this.serializeKey(k), val)
    return this._createNew(newData)
  }
  private serializeKey(key: K) {
    const serKey = serializeIndexVal(key)
    return serKey as K
  }
}