import { ImmutableStruct } from './common';
import { OrderedMap as IOrderedMap } from 'immutable';
import {List} from './list';

export class OrderedMap<K, V> extends ImmutableStruct<IOrderedMap<K, V>> {
  protected readonly _data: IOrderedMap<K, V>
  constructor(vals?: any[] | IOrderedMap<K, V> | List<[K, V]>) {
    super()
    if (vals === undefined) {
      this._data = IOrderedMap<K,V>()
    } else if (IOrderedMap.isOrderedMap(vals)) {
      this._data = vals
    } else {
      // const type = findTypeInTypesChain(typeFromProp, new.target, List)
      this._data = IOrderedMap<K,V>(vals) //todo4:
    }
  }
  toJS() {
    return this._data.toJS()
  }
  toJSON() {
    return this.toJS()
  }
  [Symbol.iterator]() {
    return this._data[Symbol.iterator]()
  }
  map<R>(cb: (v: V, k: K) => R) {
    return new OrderedMap(this._data.map(cb))
  }
  toArray() {
    return this._data.valueSeq().toArray()
  }
  prepend(key: K, val: V) {
    const newData = IOrderedMap<K,V>([[key, val]]).concat(this._data.concat())
    return this._createNew(newData)
  }
  forEach(cb: (v: V, k: K) => any) {
    return this._data.forEach(cb)
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
  get length() {
    return this._data.count()
  }
}