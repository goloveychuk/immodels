import { Map as IMap } from 'immutable';
import {ImmutableStruct} from './common';

import { Deserializers } from './deserializers';


function setProp(prototype: any, name: string | number) {
  Object.defineProperty(prototype, name, {
    get: function (this: any) {
      return this.get(name);
    },
    set: function (this: any, value) {
      // invariant(false, 'Cannot set on an immutable record.'); //todo3:
    }
  });
}


export class Record extends ImmutableStruct<IMap<string | number, any>> {
  protected _data: IMap<string | number, any>
  constructor(resp?: any | IMap<string, any>) {
    super()
    if (IMap.isMap(resp)) {
      this._data = resp;
    } else {
      const vals = this.deserialize(resp, new.target)
      this._data = IMap(vals);
    }
    for (const key of this._data.keys()) {
        setProp(this, key)
    }
    // Object.freeze(this) //todo3: proxy
  }
  toJS() {
    return this._data.toJS()
  }
  toJSON() {
    return this.toJS()
  }
  deserialize(resp: any, target: any) {
    return Deserializers.deserializeRecord(resp, target)
  }

  clear() { //not sure what with setProp and undefined
    return this._createNew()
  }

  // return inst
  
  // setIn<K1 extends keyof this, V1 extends this[K1], K2 extends keyof V1, V2 extends V1[K2]>(path: [K1, K2], v: V2): this
  // setIn<K1 extends keyof this, V1 extends this[K1]>(path: [K1], v: V1) {
  //   const newValues = this._data.setIn(path, v);
  //   return this._createNew(newValues)
  // }
  
  set<K extends keyof this>(k: K, v: this[K]): this {
    const newValues = this._data.set(k, v);
    return this._createNew(newValues)
  }
  get<K extends keyof this>(k: K): this[K] {
    return this._data.get(k)
  }
  merge(obj: Partial<this>): this {
    const newValues = this._data.merge(obj)
    return this._createNew(newValues)
  }
}

