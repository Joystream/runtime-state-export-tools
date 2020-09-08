import { Tuple, Vec } from '@polkadot/types';
import { Codec, Constructor } from '@polkadot/types/types';
import Linkage from '@polkadot/types/codec/Linkage';

export class SingleLinkedMapEntry<K extends Codec, V extends Codec> extends Tuple {
    constructor (KeyType: Constructor<K>, ValueType: Constructor<V>, value?: any) {
        super({
            value: ValueType,
            linkage: Linkage.withKey(KeyType)
        }, value);
    }

    get value (): V {
        return this[0] as unknown as V;
    }

    get linkage (): Linkage<K> {
        return this[1] as unknown as Linkage<K>;
    }
}

export class LinkedMap<K extends Codec, V extends Codec> extends Tuple {
    constructor (KeyType: Constructor<K>, ValueType: Constructor<V>, value?: any) {
      super({
        keys: Vec.with(KeyType),
        values: Vec.with(ValueType)
      }, value);
    }
  
    get linked_keys (): Vec<K> {
      return this[0] as unknown as Vec<K>;
    }
  
    get linked_values (): Vec<V> {
      return this[1] as unknown as Vec<V>;
    }
  }
  