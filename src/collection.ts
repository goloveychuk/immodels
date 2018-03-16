
import { ImmutableStruct, serializeIndexVal, IndexVal } from './common';
import { List } from './List'
import { findTypeInTypesChain, unwrap } from './utils'

import { OrderedMap as IOrderedMap, Map as IMap, List as Ilist } from 'immutable';

import { Types, getType } from 'tsruntime';
import { Deserializers } from './deserializers';

// interface ListOrArray<V> {
//   map<R>(cb: (v: V, k: number) => R): ListOrArray<R> 
// }

//todo2: make keyed protocol, move toKey to model, rename Collection -> OrderedMap, same for Map
//todo2: think about IndexedCollection, IndexedMap, mb higher order structure

export abstract class Collection<K, V> extends ImmutableStruct<IOrderedMap<K, V>> {
  protected abstract getKey(v: V): K
  protected readonly _data: IOrderedMap<K, V>

  constructor(vals?: V[] | IOrderedMap<K, V>, typeFromProp?: Types.ReferenceType) {
    super()
    if (vals === undefined) {
      this._data = IOrderedMap<K, V>()
    } else if (IOrderedMap.isOrderedMap(vals)) {
      this._data = vals
    } else {
      if ((typeFromProp === undefined) && (getType(new.target) === undefined)) {
        this._data = this._makeMap(vals)
        return
      }
      const type = findTypeInTypesChain(typeFromProp, new.target as any, Collection as any)
      vals = Deserializers.deserializeList(type.arguments[1], vals)

      this._data = this._makeMap(vals)
    }
  }
  toJS() {
    return this._data.valueSeq().toJS()
  }
  toJSON() {
    return this._data.valueSeq().toJS()
  }
  forEach(cb: (v: V, k: K) => boolean | void) {
    return this._data.forEach(cb)
  }
  prepend(v: V): this {
    const newData = IOrderedMap([[this.getKey(v), v] as [K, V]]).concat(this._data);
    return this._createNew(newData)

  }
  set(val: V): this {
    const newData = this._data.set(this.getKey(val), val)
    return this._createNew(newData)
  }
  get(key: K): V | undefined {
    return this._data.get(key)
  }
  delete(key: K) {
    const newData = this._data.delete(key)
    return this._createNew(newData)
  }
  deleteV(v: V) {
    return this.delete(this.getKey(v))
  }
  protected _makeMap(vals: V[]) {
    const col = vals.map(d => [this.getKey(d), d] as [K, V]);
    return IOrderedMap<K, V>(col);
  }
  slice(begin?: number, end?: number) {
    return  this._createNew(this._data.slice(begin, end))
  }
  has(key: K) {
    return this._data.has(key)
  }
  hasV(v: V) {
    return this.has(this.getKey(v))
  }
  [Symbol.iterator]() {
    return this._data[Symbol.iterator]()
  }
  get length() {
    return this._data.count()
  }
  isEmpty() {
    return this._data.isEmpty()
  }
  map<R>(cb: (v: V, k: K) => R) {
    return new List(this._data.map(cb).toList()) //todo2: iterable protocol for list and collection
  }
}



// @Reflective //todo2: make find prototype in chain without extends, 
export abstract class IndexedCollection<K, V, I extends IndexVal, M=null> extends Collection<K, V> {
  private index: IMap<string, Ilist<K>>
  private metadata: IMap<string, M>
  constructor(vals?: V[] | IOrderedMap<K, V>, index?: IMap<string, Ilist<K>>, metadata?: IMap<string, M>) {
    super(vals)
    if (index !== undefined) {
      this.index = index
    } else {
      this.index = IMap<string, Ilist<K>>()
    }
    if (metadata !== undefined) {
      this.metadata = metadata
    } else {
      this.metadata = IMap<string, M>()
    }
  }
  _createNew(newData: IOrderedMap<K, V>, newIndex?: IMap<string, Ilist<K>>, newMetadata?: IMap<string, M>) {
    const index = (newIndex !== undefined) ? newIndex : this.index
    const metadata = (newMetadata !== undefined) ? newMetadata : this.metadata
    return super._createNew(newData, index, metadata)
  }
  private serializeKey(key: I) {
    const serKey = serializeIndexVal(key)
    return serKey
  }
  setWithKey(key: I, vals: V[], metadata: M): this {
    const serializedKey = this.serializeKey(key)
    const valsCol = this._makeMap(vals)
    const keys = Ilist(valsCol.keys());
    const newIndex = this.index.set(serializedKey, keys)
    const newMetadata = this.metadata.set(serializedKey, metadata)
    const newData = this._data.concat(valsCol)
    const newCol = this._createNew(newData, newIndex, newMetadata)
    return newCol
  }
  concatWithKey(key: I, vals: V[], metadata: M): this {
    const oldColl = this.getWithKey(key)
    if (oldColl === undefined) {
      return this.setWithKey(key, vals, metadata)
    }
    const newList = oldColl.data.toArray().concat(vals);
    return this.setWithKey(key, newList, metadata)
  }
  prependWithKey(key: I, vals: V[], metadata: M): this {
    const oldColl = this.getWithKey(key)
    if (oldColl === undefined) {
      return this.setWithKey(key, vals, metadata)
    }
    const newList = vals.concat(oldColl.data.toArray());
    return this.setWithKey(key, newList, metadata)
  }
  getWithKey(key: I): { data: List<V>, metadata: M } | undefined {
    const serializedKey = this.serializeKey(key)
    const ids = this.index.get(serializedKey)
    if (ids == undefined) {
      return undefined
    }
    const data = ids.map(id => {
      const obj = unwrap(this.get(id), "can't find id in _data, but it presented on index")
      return obj
    })
    const dataList = new List(data)
    const metadata = unwrap(this.metadata.get(serializedKey))
    return { data: dataList, metadata }
  }
}