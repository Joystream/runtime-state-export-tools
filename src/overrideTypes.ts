import { GenericAccountId } from '@polkadot/types'
import { StakeId } from '@joystream/types/stake'
import AccountId from '@polkadot/types/primitive/Generic/AccountId'
import { JoyStruct } from '@joystream/types/common'

export type IActiveStake = {
  stakeId: StakeId
  sourceAccountId: AccountId
}

export class ActiveStake extends JoyStruct<IActiveStake> {
  constructor(value?: IActiveStake) {
    super(
      {
        stakeId: StakeId,
        sourceAccountId: GenericAccountId,
      },
      value
    )
  }
}
