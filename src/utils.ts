import { Constructor } from './common';
import { Types, getType } from 'tsruntime';


function getExtendType(constructor: Constructor): Types.ReferenceType {
    const clsType = getType(constructor)

    if (clsType == undefined) {
        throw new Error("can't find type")
    }
    if (clsType.kind !== Types.TypeKind.Class) {
        throw new Error('not cls')
    }
    if (clsType.extends === undefined || clsType.extends.kind !== Types.TypeKind.Reference) {
        throw new Error('bad extend')
    }
    return clsType.extends
}

export function findTypeInTypesChain(typeFromProp: Types.ReferenceType | undefined, parentConstuctor: Constructor, findType: Constructor) {
    let type: Types.ReferenceType;
    if (typeFromProp !== undefined) {
        type = typeFromProp
    } else {
        type = getExtendType(parentConstuctor)
    }

    while (true) {
        if (type.type === findType) {
            return type
        }
        type = getExtendType(type.type)
    }
}


interface ToJS {
    toJS(): Object
}


export function unwrap<T>(v: T | undefined, msg?: string) {
    if (v === undefined) {
        throw new Error(msg || "v is undefined")
    }
    return v
}

export function invariant(condition: any, error: string) {
    if (!condition) throw new Error(error);
}