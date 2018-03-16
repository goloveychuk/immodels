

export type Constructor = { new (...args: any[]): any }



export abstract class ImmutableStruct<T> {
  protected abstract readonly _data: T
  protected _createNew(...args: any[]): this {
    return new (<any>this).constructor(...args)
  }
}


export type IndexVal = string | number | boolean | undefined | null | IndexRepresentable | IndexObj

type IndexObj = {[key: string]: IndexVal }

export interface IndexRepresentable {
  toIndexKey(): IndexVal
}



function isIndexRepresentable(v: any): v is IndexRepresentable {
  return (v as IndexRepresentable).toIndexKey !== undefined
}

export function serializeIndexVal(val: IndexVal): string {
  if (typeof val === 'string') {
    return val
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return val.toString()
  }
  if (val === null) {
    return '%NUL%'
  }
  if (val === undefined) {
    return '%UND%'
  }
  if (isIndexRepresentable(val)) {
    const v = val.toIndexKey()
    return serializeIndexVal(v)
  }
  if (typeof val === 'object') {
    const strings = Object.keys(val).sort().map(k => {
      const v = serializeIndexVal(val[k])
      return `"${v}"`
    } )
    return '{'+strings.join('|')+'}'
  }
  throw new Error(`bad val: ${val}`)
  
}