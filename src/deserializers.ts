import { Constructor } from './common';
import * as Lodash from 'lodash';
import { Types, mustGetType, getType, getPropType, mustGetPropType } from 'tsruntime';
import { invariant } from './utils';


function IsTestingEnv() {
  return process.env.NODE_ENV === 'testing';
}

class DeserializeError extends Error {
  constructor(message?: string) {
    super(message); // 'Error' breaks prototype chain here
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
  }
}

const IgnorePropsKey = Symbol('ignoreprops')
const IgnoreAllPropsKey = Symbol('ignoreAllProps')

export function IgnoreProps(...list: string[]) {
  return function (target: Constructor) {
    for (const prop of list) {
      Reflect.defineMetadata(IgnorePropsKey, true, target, prop)
    }
  }
}

export const IgnoreAllProps = Reflect.metadata(IgnoreAllPropsKey, true)


function PropIsIgnored(target: Constructor, prop: string) {
  if (Reflect.getMetadata(IgnoreAllPropsKey, target) === true) {
    return true
  }
  return Reflect.getMetadata(IgnorePropsKey, target, prop) === true
}


type ErrorContext = { type: Types.Type, targetType: Types.ClassType, key: string | number, val?: any }

function onDeserializeError(err: Error, errorContext: ErrorContext) {
  if (err instanceof DeserializeError) {
    throw err
  }
  const errMessage = `error in deserializing value
text=${err.message}

expected type: ${JSON.stringify(errorContext.type)}

fieldKey: ${errorContext.key}

value: ${JSON.stringify(errorContext.val)}

clsname: ${errorContext.targetType.name}`

  const newErr = new DeserializeError(errMessage); //todo3: make everything {}
  newErr.stack = err.stack;
  // throw newErr
  if (!IsTestingEnv()) {
    console.error(newErr)
  }
}

function sortByPriority(types: Types.Type[]): Types.Type[] {

  const priority: Types.Type[] = []
  const notPriority: Types.Type[] = []
  for (const t of types) {

    if (t.kind !== Types.TypeKind.Undefined && t.kind !== Types.TypeKind.Null) {
      priority.push(t)
    } else {
      notPriority.push(t)
    }
  }
  return priority.concat(notPriority)
}


function normalizeValue(type: Types.Type, val: any): any {

  if (val === undefined || val === null) {
    switch (type.kind) {
      case Types.TypeKind.Boolean:
        return false
      case Types.TypeKind.String:
        return ''
      case Types.TypeKind.Number:
        return 0
      case Types.TypeKind.Null:
        return null
      case Types.TypeKind.Undefined:
        return undefined
      case Types.TypeKind.Union:
        const arr = sortByPriority(type.types).reverse()
        for (const t of arr) {
          return normalizeValue(t, undefined)
        }
        return {}
      case Types.TypeKind.Reference:
        try{
          return new type.type()
        } catch (er) {
          return {}
        }
      default:
        return {}
    }
  }
  return val
}


export module Deserializers {

  export function deserializeValue(type: Types.Type, val: any): any {
    if (val === undefined) {
      if (typeHasUndefined(type)) {
        return undefined
      } else {
        invariant(false, 'received undefined val, but type is not optional')
      }
    }
    switch (type.kind) {
      case Types.TypeKind.StringLiteral:
      case Types.TypeKind.NumberLiteral:
        invariant(type.value === val, 'should be same')
        break
      case Types.TypeKind.String:
        invariant(Lodash.isString(val), "should be string");
        break
      case Types.TypeKind.Number:
        invariant(Lodash.isNumber(val), "should be number");
        break
      case Types.TypeKind.Boolean:
        invariant(Lodash.isBoolean(val), "should be boolean");
        break
      case Types.TypeKind.Interface:
        break
      case Types.TypeKind.Reference:
        return deserializeReference(type, val)
      case Types.TypeKind.Union:
        return deserializeUnion(type, val)
      case Types.TypeKind.Null:
        invariant(val === null, "should be null")
        break
      case Types.TypeKind.Undefined:
        invariant(val === undefined, "should be undefiend")
        break

      default:
        invariant(false, "unknown type")
    }
    return val
  }

  function deserializeReference(type: Types.ReferenceType, val: any) {
    if (val instanceof type.type) {
      return val
    }
    if (type.type === Date) {
      invariant(Lodash.isString(val), "should be date string");
      invariant((val as string).length > 0, "date string shouldn't be empty")
      return new Date(val)
    }
    return new type.type(val, type)
  }

  function deserializeUnion(type: Types.UnionType, val: any) {
    for (const t of sortByPriority(type.types)) {
      try {
        const res = deserializeValue(t, val)
        return res
      } catch (err) {
        continue
      }
    }
    invariant(false, `any of union type is correct`)

  }

  export function deserializeList(type: Types.Type, vals: any[]) {
    invariant(Lodash.isArray(vals), "is not array");
    return vals.map((v: any) => {
      return deserializeValue(type, v);
    });
  }

  export function deserializeMap(keyType: Types.Type, valType: Types.Type, vals: any) {
    invariant(Lodash.isObject(vals), "is not an object");

    const res = []
    for (const key in vals) {
      let desKey = deserializeValue(keyType, key)
      let desVal = deserializeValue(valType, vals[key])
      res.push([desKey, desVal])
    }
    return res
  }



  export function deserializeRecord(resp: IndexedObject | undefined, target: Constructor) {
    const targetType = mustGetType(target)
    if (targetType.kind !== Types.TypeKind.Class) {
      throw new Error('target not cls')
    }
    
    const found = new Set<string | number>()
    const values = new Map<string | number, any>()
    if (resp === undefined) {
      resp = {}
    }

    invariant(Lodash.isObject(resp), "bad type")


    // props from resp
    for (const key in resp) {
      const type = getPropType(target, key)
      const val = resp[key]

      let newVal;
      if (type == undefined) {
        if (!PropIsIgnored(target, key)) {
          if (!IsTestingEnv) {
            console.error(`no such key on struct: ${key}, clsname: ${targetType.name}`)
          }
          values.set(key, val)
        }
        continue
      }
      found.add(key)
      try {
        newVal = deserializeValue(type, val)
      } catch (err) {
        onDeserializeError(err, { key, type, val, targetType })
        newVal = normalizeValue(type, val)
      }
      values.set(key, newVal)
    }

    // props from initializer
    const allProps = getAllProps(target)
    for (const key of allProps) {
      if (found.has(key)) {
        continue
      }
      const type = mustGetPropType(target, key)
      let newVal;
      try {
        if (type.initializer === undefined) {
          if (typeHasUndefined(type) === true) {
            newVal = undefined
          } else {
            invariant(false, `prop didn't found and not optional and don't have default initializer`)
          }
        } else {
          newVal = type.initializer();
        }
      } catch (err) {
        onDeserializeError(err, { key, type, targetType })
        newVal = normalizeValue(type, undefined)
      }
      values.set(key, newVal);
    }

    return values

  }
}


function typeHasUndefined(type: Types.Type): boolean {
  switch (type.kind) {
    case Types.TypeKind.Undefined:
      return true
    case Types.TypeKind.Union:
      for (const t of type.types) {
        if (t.kind === Types.TypeKind.Undefined) {
          return true
        }
      }
      return false
    default:
      return false
  }
}

export function getAllProps(startTarget: Constructor) {
  let allProps: (string | number)[] = []
  let target = startTarget
  while (target) {

    const type = getType(target)
    if (type === undefined) {
      break;
    }
    if (type.kind !== Types.TypeKind.Class) {
      throw new Error('not cls')
    }
    allProps.push(...type.props)
    if (!type.extends) {
      break;
    }

    if (type.extends.kind === Types.TypeKind.Reference) {
      target = type.extends.type
    }
  }
  return allProps
}
