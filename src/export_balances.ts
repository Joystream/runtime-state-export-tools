import create_api from './api'
import { ApiPromise } from '@polkadot/api'
import { MemberId, Membership } from '@joystream/types/members'
import { Seat, SealedVote } from '@joystream/types/council'
import { Option, Vec } from '@polkadot/types/'
import {
  AccountId,
  Balance,
  Hash,
  StakingLedger,
} from '@polkadot/types/interfaces'
import { ProposalId, ActiveStake } from '@joystream/types/proposals'
import assert from 'assert'
import { StakeId, StakedState } from '@joystream/types/stake'

type MemberAndStake = {
  memberId: MemberId
  stakeId: StakeId
}

enum WorkingGroups {
  ContentCurators = 'curators',
  StorageProviders = 'storageProviders',
}

const apiModuleByGroup = {
  [WorkingGroups.StorageProviders]: 'storageWorkingGroup',
  [WorkingGroups.ContentCurators]: 'contentDirectoryWorkingGroup',
} as const

main()

async function main() {
  const api = await create_api()

  const memberAccounts = await enumerateMemberAccounts(api)
  const councilAccounts = await enumerateCouncilParticipantAccounts(api)
  const validatorAccounts = await enumerateValidatorAccounts(api)
  const storageWorkerAccounts = await enumerateWorkingGroupWorkerAccountsAndStakes(
    api,
    WorkingGroups.StorageProviders
  )
  const contentWorkerAccounts = await enumerateWorkingGroupWorkerAccountsAndStakes(
    api,
    WorkingGroups.ContentCurators
  )
  const rewardedAccounts = await enumerateRewardedAccounts(api)

  const allAccounts = new Set([
    ...memberAccounts.rootAccounts.values(),
    ...memberAccounts.controllerAccounts.values(),
    ...councilAccounts,
    ...validatorAccounts,
    ...storageWorkerAccounts.roleAccounts,
    ...contentWorkerAccounts.roleAccounts,
    ...rewardedAccounts,
    '5Co9fgda84MeR4SLwfE8EZGXKESkbtf4qAnrfVDTKsPK4qAL',
    '5CJzTaCp5fuqG7NdJQ6oUCwdmFHKichew8w4RZ3zFHM8qSe6',
    '5DcAKnrUmfes76j5ok8XcFheTdzS72NFsJA56AzVrNz9gVEz',
    '5D5PhZQNJzcJXVBxwJxZcsutjKPqUPydrvpu6HeiBfMaeKQu',
    '5EnrUFhvtMxSxjs8rf9dyLs98c8ZumPWeFMWenJE9aYCfEXE',
    '5EvdRVWr2A1VW9N7oKU9MojmwfCoFMHyJJcaHrzJwTo6zSuk',
    '5GxZSWH4jq44AhAdiZabqyt29pWAmLqpqKtxixrjJgMtPgcP',
    '5Dscfph6Pfe53JoBqmBYUQ8zaCqf9kLGEGK8iCvpk2mdYbjz',
    '5DCp4xYWPULnoJwziW4FXRHwsRZGk3DF2ydyNMRWKB4hoxGz',
    '5CiFePuRcLDhAuDNBLq1YByf8YmKChb3L5Mu1oo3S9ojUZX9',
    '5DoeVJzKAxkHUuWMFAtF2MYKLJ5LrNxwbvhwwmSeo1wtGmz4',
    '5HMXXXkqTZVV2tu83HUkvxU5Mx9wSh8cFGscvtWsNbB8DUHs',
    '5HCD5aegVn1p85he8wEWKFpNSCe7guEN8STXesgvccLXJ8fA',
    '5ERNgXsiNRpQxS8bENVHKtYiMuCN16RcWKAyzjUb3futFvoB',
    '5ETs7Y3hWfthmz7V8nKpKk4NZUNhKbSQ5gNBq7X3emhPry1j',
    '5EkDRy4mX9EDqz5VKYVC8UZxBAJmyHhFim7N4sSdwt6XWUnr',
    '5EqCKV2prqxvhwWxejmTJpjuHmC5GL5gvxJ15p1ucGaGy59h',
    '5E1rwAmCDDib5yv3gJ9o19y3qpRLD8T1xZaDELfzR59tKAPj',
    '5CotbidJTpK4zEiQnH6A9rHYQZY11LFiukuQDrMJaLxvRP4i',
    '5HbBgQbHJKqHb5dUWz99ZwCRowX9khBArviV6rTFrB484Jzz',
    '5Dr5vebXcyEEjz6o2nQR8f3WYL1ryuYYnreL1bYAeVxDgKuY',
    '5Fdy49sJtAcQEXn9j8sQkqNTp9vs35AeaBP4qqs7oUB24xJA',
    '5DPRMCbM8USu16rr9R2qoAJdVe4t8k6HFdXGfypmFETJWVzX',
    '5Gq4Bb4CCaWnzk7XFDFytD9wmZbrFCx9yRQHSPYprMWCfUSh',
    '5CG4Rd22kA4oNJ4jrff1wZTQz4TsdXzd4f7MV3vaiFqjr5Zv',
    '5HTet1p53kFm2uk1hcndN6X9d7p3GTRr4ZLbsWGEFYJP4yhm',
    '5F7L5ucCmeq8PtqzJ3JZiYBCuT7pd6QwxkMxqrfMu9Z2HYZV',
    '5CUwGbt3M9dt1XRDTXDjQgb3DMrhvTkwGnAaRrfGpSPpkBRx',
    '5EppsyAtJjy62SUNos8bUyc7WqbqA5Y2rtEuFbKw3g2nguiz',
    '5CcrMreyFQQ9L1zNKJx5xTKcMp7xLcSk6KSTiHNs9rnR2soP',
    '5FCccjd9qmz3Nixes62c5WHijGPLcxf6gNU6DX3yhgarmWKs',
    '5E2ezXj4Tm93GsTSRV5wJicXZynvDMogxLt12uCSov9hXPTM',
    '5HBFVLQJtDwxjMdrrQGHf1zDr2vbyGti7iEfmy9hQKGdaxor',
    '5HQDfgus5ZMxdEeQBtjDse6L1pjpP9B3dyw5YfKC9wqntzCc',
    '5HTqjUJNn6VjUHP9kz7hQmn6bgSUSQ98fFoZsNAkBj7jjB2M',
    '5EHEtKXJACrSMsLEsMohDTT922Tj8rRGjh7NKMgtqjVSBovb',
    '5H48R7AWvzh8prAia3sYdEC5oCAcewEnWfQC7jEngoxfcbW9',
    '5ELzZ2u4STgYL5FjQjhnhhNJu2UGkNRWn3jBRW2kUqQX5kWm',
    '5Fc3kjJzENJ6QNwkMa4fMmCKf2c7FjBUJZP8UKoMyncWj5H2',
    '5CZyH8DWu2d439q8CpAkHDk98mRG5vmE4NjrJUGxrFtTjmPq',
    '5F4CdUbkzjsunkVT3y3Xjic4fDcjSDcxY46RZf8uFKRPidhq',
    '5CSCyBCYwNwaVAo9HebK5RrDwXnFC8kSw5edjdbscfmhoXTz',
    '5H1pxvPEVczFoqjSmVhkdQ9eC3DDEEa9cw43xBYQrcXyrWTy',
    '5CDpMdwkpwZiEmdRaXQaPNcrjDguSrxCN8cRo7SCyqmbmhcw',
    '5HDmszjVx5pbY2kPKM6V9SmDUSCUoZJB7L4SeDhDJMsP9XPu',
    '5CG9gy256tytKkC1QzUJXHFFaZDuVC24LcgyTR8G8AXxBbgu',
    '5Hn1UD1z9EPSDD5z2rDYchZ5QZGvRu37fhR2eED6QnbEqiRf',
    '5ENU8Aag9pztDAXRkfKRPfoCgFve4fZxWU3T3FaCTsik8mGu',
    '5HbqTmdtmgfHRtGgt6FXYDu6yg6D91eqpKSwK6dxsCPFQMjG',
    '5DQ2R2icHmYfofXDhqsj3BEEMBCXCAomo6N9idSWRBYZBhMs',
    '5EZt6JEZpLVaCGXHEyWU2GT8v1GncD5em68Coe3TNGqxT8yF',
    '5HeDymrqpZY9d8mC6WuJRCD4MnM9kVa4X8a3cQB44f4B4vz4',
    '5Eq2QDyoP34A5iS74UrPc2cRYiikTqPLxvxDwiN9K2XKXbuJ',
    '5Ebv83vsszkyKtQ5ud1XWWTM6xHMY3egUywqEXcdpixwyPbB',
    '5HMkYCLZCxL4FotpELrqA1romQGfSFtrMR8xXUMdLmswXjqS',
    '5CBFGi7nSFzVZCZXcg5Koi8orLoBwjj3ZRjpmVsJ86kuiBHM',
    '5FRR4vL1HbVoedoj5EXwbtWiMwLfvVRHXSkd1Dzep9ZGqDZ5',
    '5CZeFqpE6kCyPDVaJXym2w9QF9p8hhBpT17Hx7Rap3XFEmPw',
    '5C4tRqyAg7UNWFkaCN4YgpS8jireWaH1HEZJ4s8vVvnMFSdN',
    '5H3sBeoFWZxxH41cRRRUHoubfrKR8YASr5m2qqLkJ2sStQUQ',
    '5GHXTHTcR3QVcc3kBdjNw4QEokCH9qqCadRBaqLiRtEwjGfS',
    '5HgwbC5eTGN13zEGwisPfKmd4BgMPy3q6CnS4hGEDddgp1LR',
    '5E2FGSexKU3FhUyuPqv8LSCfb729EvDrE3kjNgJvXP6soW94',
    '5C4tAQvgFueVRHmmB5NHx1RTjWUjfA9HBgVwM3UUGD4T6Z7t',
    '5DSgJrXhaJjCaPxVn7SH1yUmi7eQ3vb9UCtLzbnzejvWzQdx',
    '5DaEqRJ8FKkvV1rvPDyEDMvwFaRq6MiAFo8UstuV93dviRaE',
    '5HjCLp9YvdowMVK3fbjkqEP54rV8YPizvHCDn1wYZ7nHPTA5',
    '5G1hhaQUaCNhFWpHeRzg3VhhzHVV663jhVg4CVLhhDzdhPsQ',
    '5GBz9ztCFCSisHAEnqcPjMPJ37A29LDyRcfFeC8UhFefVkTq',
    '5EfJ78UToQmEnA8BgscizFvYqTxK9Vj5ouKSMCe1Swk7e7d4',
    '5C7odE1rpiu4p98ogL2THT9jbdHDKbGS2oXkYPvBXEkVK5bR',
    '5DHnKVhYhXwSM5UQBBNDxafryZKM6VZ4eRA4HTETb2UiXwmx',
    '5EXYQeJg3fGn3bLiRJHDvhAb81Wn6oLtrWZvganWYvKMezLE',
    '5HKv1V9qCVpTkFtYCBSc5KUNsuNEjoS94owGmiu9K2GhAkFW',
    '5HjkkBTiWQPTrYiseuGmUe9wLhY5SVHfjLfufdxDB3mAeztj',
    '5FbVjT9gzAG72ST3HVDxw4QA84sC9nyrNwEAczxK5uXuubio',
    '5CPsnSBhi8uFxmKdioZR9st3JM8pbPp4PBHunFVCCA49G9HQ',
    '5Dcq8KieTNwNtgELCXhFq67zUVxarCsPmQhbcz5PTDraFPxo',
    '5EcEQJasZTGgt3jkmx6DXwP4F8uCtHuYhKPhineRHjdMiDSG',
    '5DUYvZeBgZer5SZyGbeSs5ypzzd7wYcgfoJdiJU7o9bfP4PG',
    '5CmBLjAQRWgKMz5y4iXMAsH6nK1Y6NNHJ8MZhYQtvUz4EodP',
    '5HfyBRex2oMz2rEVYFvDbGqiXhafhW7Fo3Q3kQcoBLrXMx9r',
    '5EYwRQKncpw1tnZXWqThFEZ8xXpxCziLuWUy8vpfAWMDdxAT',
    '5HDnLTfSMBT9qQ8k654WppFBoEFWekksxn88LBmgqRReJWQP',
    '5CQKb1LW3WxHSf2fPEfQSPuypdZhFQxg3jStEqQ27jocgMS1',
    '5CSMHUFXErjxVCUJ2iK8zNdKwTabCt7yCT7DQwLhpa8xAJrP',
    '5GU6WQ2CQUsGLqAgfkaPMbxnvPDWDqtvgFxaqRiCSqXwbQwo',
    '5EoCkrt1v9u45WpFUkct11BbUxCEtyz961w4eXTvrPymsyt9',
    '5F747eyzfurSrZCjZNvrikfnbKmzkwdc9c6vEDbJ9m5GVu8r',
    '5FFCBZz5FEapjjiXK8CGrWsXA48JMzDih9U2ffAyR6SGLZNx',
    '5HdpVAtnMRTbNHgaUkhVG94akwqrwWDHEEt1JarSkGvGDgdU',
    '5F2NacpG5Ho1ZKb1WSDWLL2inWG89W4De4JWxpPv7wLD4ukL',
    '5EjxQUnterFai7N9MsxFs9faYDF38tN1rjHoEmwLDHVN1xxz',
    '5Ckr4mC7esLVKwAdnxcNXGZWYjQ9oPZkpowZGRfxfdDtXqvc',
    '5HpWjUL98SBFqBYRAHLH4cHqG8bkqJAptjZKBbShc9n6s64Z',
    '5EJUhCzMe4FNVK3A23NJzHXif4gkW2hw2V62g3gH1cVJpSHy',
    '5FpxTirc1j5CE43R2dHAKWsY12K355TMEdAJKYZAnVFDNv1W',
    '5GeGH9DnZxnYf1wHyXH3AV3Wh2kzq3ZrL4qNJGNMxLC17sju',
    '5FjZiAwvMtsRZmFjU5dE6x1wgayumhZUvwYqKXLYVv5S7muR',
    '5FyJ1qKqyYpvoR8CiTZ6G9fX2UzWSeTqx9cY2uMQSuuuv8KA',
    '5HVwEBGUqK6GDRoXt8g9huf2PVzFGK5GD2vf8G5qWph6YTUj',
    '5CkycCacSzjiDnHpa6MagztKb43dEj2RLfRa89rLKvyBN8mS',
    '5DcPya2i54bwSbhckJvPGmPjC9nosX9GM8C6HS3wWBDLtbLt',
    '5Ggk1bDTo9Hkfv4tVoGewWMVr7AQUYjKAjRY4y9LEoD3HvLg',
    '5EWcsnwRnTz3WWJ19dUZdWRy7tWH7CQMZhccZM4BSd7uurJE',
    '5E74KZXuM3NbkD2Peauae1UtK3NpUZEAtGLmuWGpFq2qdjt2',
    '5E2MPNaqZvhQ1KsaTRzhQa6e9EqmsLBsM6ZdR657pFogWQPR',
    '5F1fbFhGtDzZ6263VWGh9J2PEdp9FryvSsa6tGPSYzTgN9jK',
    '5HBhZCJbcAFpgnBesr62c3qXvUAZwHzP3RRNjjKgSNQi1ZLK',
    '5DFXYrrds9YgVCbqd68d2H6jXFTBGY3xG1Lh5YtejHSdZahK',
    '5HRRLJmMBpDX8uGuDqYSQSsWsjY5jmGFzBUr8fEakTQUSvZg',
    '5DUD7nfDMTj56r4yXWrBoiQxpEMhrcmZmgV3FzLZp1icaXv8',
    '5DyxbZnxWD2F1PoR5s7TzufawoCfo6FDM8krhFi7Acm8JTR8',
    '5DZikCtNSYp54GuAn4SKvyx6MvHZCHAY6HynV8w5xAYovb5s',
    '5FmunZzwQGSPjqJMWXkzxmVBJhFRFGMYxNMoxHyRFzBixUcQ',
    '5CrVm7ZpCugoRecwJPh5E8mjNGMErLWcu1hy65HiR2tCnszP',
    '5FPL2A2pwzU8BytrxqLV1ETquAy1kLaGYL2reP4vfPRuUyo8',
    '5GefxFx1huC14QKNByGAgxmZYdj5fApiCXn6Vt3FpnfzN4MA',
    '5FudXsTqTPyzv6hJfoXziaiGoFrgWjYANtL9xSo5x9ktDuB5',
    '5G3yfr74Tg4L7bPuf8aMQVieAsnfXmwmS5isYttnVddtAQcs',
    '5FHTtcEeu3f9aA73RJvTcwjA8AbzGGKQQzq9AnGNrEt42jgN',
    '5EAd1bGHmQFqeSarRWDE3uZ1nfUN4NfjbNkhfNKs3C8QZmok',
    '5EyaDJxhFRD7bAGPLpWkeFHLupcGtRaLwA1jHnfJfjw64MA7',
    '5G9Qss9M3b84euht185Vz4F2CLqbkDWqREWfhQKCK1MviSiM',
    '5HT27aUy7Z2bE3ihGQQX8mcePM6bx8Ypbw93VVRVq4e3GMw5',
    '5DjhywjqBSU31LAXBj8LTZmsvXscVoRrDBw8zkkh1ziaFDmg',
    '5Gui4fkjHgD14tCeeZUgnfcHTZkn4SG89VkTqGKbvy1Fv6JG',
    '5CJqKJGnBJbQeeoDdQRLd6GpNrm1rP5ZExJVd7jMGoAUJWmM',
    '5HC7hi4bFygwvbHPygg1vtJ3rLGhmtAHrujbFzY58eMwM4o8',
    '5DFmxRUZTbyx7kvQn2knrWcMjwxuN7PaWyAf5p7jmeVLrTgi',
    '5GKrNazxWrszQrZbCUWs7yFanqpkN5tzy4of4TM1GoZnfRDS',
    '5EFQUhjYTo9epenQv8VegYFyZKQmktCvT886g9t4mEvD1Vob',
    '5EjccyL38GJ81z2HQm3F7aUoZ65pfSnQJhqu9miCB9s1yu7P',
    '5FA2egkHwSDUHUTPmRfgwUGSfN5mBd5vr4TfR2VVYrXfkeyA',
    '5CHv15Q5usHSFvzvv9YpbfXnt3HQVRKQ5R6hUUKA26wmZAki',
    '5DHrFm1ZefLBwFgwYRnuGkR7SqcQe61BBHd7Ho8A2oQQjk9u',
    '5DvMeAP8yWW3yWyeHtzmAt1Xng8q8tyqv4UJJaACYMwQRmFd',
    '5F9c5s8K2pRoPxHVAdxNZYXYiQg5tAz5oTkCrYTDzhdJLVpr',
    '5FvNsBYaJCoxS3ZeMwEreDbaLJ8RYtazbJ9NTDi21YoVrrQ1',
    '5CMYbHRH579mfePY5BJDbQcpupqgbQHXbT1tkM4QnbVzv3Te',
    '5G22qqw5D1cvHnjoBBAvxr4Qg9AFSEoQB3Qb8nS6puR3bwLT',
    '5Cg6g34X5chjToqTBPmXUcaqhC7Dy1TcM6x4azrLRoMyHi78',
    '5DyFejwYjd9oQXwaMHfuBpff8WNk2h1vus1ax2PC4PYPbGY7',
    '5HZCC6PiWJ6DQinKJVc6pzAdM6kveGiCXHX3pcDX2EEq1EyT',
    '5Fsxp1uGF6mkYJDL347zVBPoLjaNFafFYu4q5LVLRGMV2XVH',
    '5FTYqg39tf3M3Kf5eWcKKi2Y4Cz1GzDjwYxkY6aoAfNmnYmb',
    '5FWdsLUfQLsYcJAvpM2KeEkckdJnr7qVZ5w43Jm1bMogCKdR',
    '5FEhZm4w7ANL8BZNU7JNGk9SqsnHgcXPiwYy94QK6SXTxpRN',
    '5EsVJE2VM5yzFktEEcUaL2oYjyVbWLjLnCHg7F6m8oUEDEGB',
    '5EAHvZXJPyEZBH36UodnWRnsUJ3PaFKdSYBefs9QzsFLQXFD',
    '5F4Rg1fCScHhT8bz6brZv9b3tQDJQLWstPfnSKxcZq2MhoZo',
    '5DDSyZnnJ34MiukUrnYhVM6ku2gAahxqP7ZKL1grG7Em5eSn',
    '5GQZbDwdkCq2xSdvvL9MMX35cPLvTy7C7yfgxNzybXKDLxwK',
    '5CDEeuFMk6BXv4GnLXcQA5gdfrGetadU9hzdbokA6u7NAr1K',
    '5HahLrAz7tgFHiLDryJVmNJcxs2PSz5XzkS9tTnM17cnMZ9u',
    '5Ejg4geCP3AMctgY6pR3TfVB6f7imQKmVqqZUmTPhWWhWKUN',
    '5GWeyoyzBmTVJUQRNNa1aMUAaxmBMi3T1e5THBa1kqFLHPc4',
    '5Cca78qgMeV7LEKaNxdYzdtUthBgeJKRkNeVKmfFK5a4fGew',
    '5HVfnaSC7L8ezA2hUNM84vt3vJ8JsLbR8Ux3KGcHBagHxpqi',
    '5Eya84bjj8n3dVawyPDa6VnwDa9b1w1bNVP7QzruYDVirEmH',
    '5HHPyepsiBA8btqqsJNCXFQELMtCg5tXvkPbSYGE8Qqsn5fa',
    '5Cci36D4iBs9FbjndjRmjJaXVoAxV75ZFbPtL5s6FbhCLuXC',
    '5FcQMbzi1BFF4NfVQBSzNSu7bkrWN3Fa7qR37y4SCVWs8hiL',
    '5DquqjGqa6DQw8gKMYrASvnnG8syfGE66BV9q5hVDDBbQ7cm',
    '5Dnse3tLETXPYaLac4cH3JQBaSkFx1vQC1dZx2kexgw1GgDZ',
    '5FEHpHQFgKcuv5cfZ7r2hChNTdTnh5BGUZddmPbSj5tHwoo2',
    '5Gmaz2i4rz1CviN7YF6WjhYwMD5Lb3PRgPxbKBBs4P4mmAXh',
    '5H6qJ3bNcuFZxjyWHbuS4Zvc2HnbW233LVWiGo7ZBiWpC9uo',
    '5G4ESpRnGwvT2rbKD6W2oWibakfiS4fvPVwCHmPz6qhXWJX2',
    '5HSmM7H35o3ajvdN65cV7B5bVSRVQeHcCf2smWSvQL4JsNEn',
    '5GZ1NaiuTbxCfgf9mjPCd3KyvVr7iaBrdo415QFSp9Lo4nbB',
    '5HKrd4FsyL9GvfUoQx5Gus8QV4ArhAgizTqAnszaZHuMFSqq',
    '5EL28J7RSSEjoWjVQBdBEErKy58ACcmutLyzxS4A52JXnfRH',
    '5HiznMkpK9T5MJX67Q1CEmFRNRjUggffnYtMLVXkVpduMjpd',
    '5CkJKPQsebBnoaT9nSEoqQLWhJorSLRHwaeUdtJbTBgFYrNg',
    '5Cr1fKeQpN7P7QSxCme4JLELV1jda3JYAQrj7etmZemwZcsE',
    '5DRmDRBEpHKCbF1FF3KvSCZsx1FZwM17W3zw5uwtvrjbzo8j',
    '5FcXt2Dq5RxhVgjaHEz7U2LyrEQGwUzYBe5B81m8ENJ7xrRz',
    '5HH7C5rWscqSaiqdYRxKWNa5Zn7mFMrthCPuy6jHDAHWTX2M',
    '5Gc29MMpFmq4NUGhUpbGW4eJQPkd5sm6bMRPf6ca8Y81izeR',
    '5H6SD6AYTP1nau5sr2bH6UMxzxD5XfDYpCn8MmeAFyqdYva7',
    '5HKp5fU9a2wnZGpCFt63xvxxg8ZF8AeBXC9dsBTYp822qZsL',
    '5E9gpYtBN8VphoZpPisBXBcYypisXRNmbWjnybcVbFxwZWop',
    '5D7bhT3AAkk26GHUfdUJfeTCTfhFg7cXPMWSFCV7PRtnVFQ1',
    '5GP3CxTijz8dSQdL2QXTfqrqj3Ek25osorTtyCabvQYbZTs4',
    '5DCgMmtCQ5zt5ZwHua6G3BK2mbxsgpitNSgn8VLug9UZVuXF',
    '5Feyb6TC19St8miBwevgSb5fnzCHEisf4ZFqcEWFuXHRAkCE',
    '5Cf6PMmZ4EZXEmuPFGZGxs5RUVYPYnZhzKUtCZNesSHsmVyz',
    '5G9xiffjS4nbPZQfeQJWhid9z13LJ8LTCJUJrauua5WSiMym',
    '5EhBSeFvYWQYBHNZG296aeLv14PCogaV7CqUexYCELvZjNVJ',
    '5FNf4F5eMBqK5HomoM5Rudb2yLKVcfGNTbD9JUFD36eL3opJ',
    '5ENqbW2YALWW7ZqmtCsiw2FBrq5EhH4PtJcfx5hjBTEf9YAr',
    '5HanXtqJ9fwaLpXx1dhSCRZquhXkYvGFGXcNyU1N1oHpqZ3r',
    '5HpQEbHhiL5eSEXCPr5zDMdYgQZjinAa5ARWpTLnvhz4wvLR',
    '5F6zVH24voVaMcJcVg6LxnWwCe2C6SHh4dBxuwyuaZ38Aovv',
    '5EvhormF3vqyBgrnH8DKaJfMA6BwkbEk7rAXd86jDqYkbwP3',
    '5DaDPsZSTsKxUeZhxaYrMk6mCswqAu82u3LgZqQ4QsQcBdtC',
    '5FCpi62wAzTr5JTRNtxqLMKMKkfyx931i8kUuMRtXjjs1eGG',
    '5EM3fSjPbDm3RC3xb1urSsMVte2XLnumug42z59bJZTz7vWa',
    '5E1gRn4Pcv91c11h8VgsVbBE5Sx34VPTCk3ZGsCpaz45JQmX',
    '5GA1KTMRfsw5asPcqMvRg4A7aihEcsPxLiNSVRATMPSRAaQN',
    '5DeZssBhtQD7zDNUiu5xUULtgzrqiiJKS5bs3BMAAumFnJbE',
    '5DiK3J17hZv6DBfXh7JfwdBCrLBH7rCtFf8VSLjooDNkSvbg',
    '5H6Gj1r224tsTFNxJwyKFE7KuTrPiUjjPVTZTUk7CM6Qakpw',
    '5FerP2En4K5JU2uyw3XvBL1yZdD3rWpsDncxyGJoMJENXezh',
    '5DLXYbWacdx9B1QcmmXPamFaHvCbZw3aXWshn5t3nPfEfUN3',
    '5GFEE3LYgroJgEU6koQwrPWWqWbdxFktdZCNZkgjXes15fxx',
    '5DCdBpsxPKfmXeHVgnqtf1gAtvNMMoVePrC14y5P7RFgKVYf',
    '5GGcHfQa4ATPddEgom9v6RV7RYzh8P4XgZozHJDJL2FonRkL',
    '5ENxoEwCPSC9zcgkVm2qQX8VC6ocAZeeUNQHRV76GG8yHxCC',
    '5DRdiPprTYmVo6LfvbKYRakMUbLXDrvmpKfprYRhDNQzQWPS',
    '5GuJ82z9JqNs4d59bezSo2cDDNQPWBwjCjFNKPYiTCkGdzyn',
    '5HDtTi6jW94SsL31Ee6GNcoxka9YTBFwm1uFZwdcy55CdZmS',
    '5EXX1Amn4qYvMWLg3SUxRGDZjVyLSDckdMoFNPNnhZNirDko',
    '5ENvHCJtY6jn2fkTp1ioc61cY5jEqNq3nDM8YqvPp8bJQq47',
    '5CoMvSZoTftiWx67iLUvys1GGrkj8hSDVeB7mtCuseKgqabi',
    '5EkJkYnVoLpbQ2PPizVV7SaowKiJ4MvHTJ6VHTYSkgAa6DUj',
    '5GBbkieU2DesxoR6DWkD4hyW1ujiTGddCwizQybKWkncMYXS',
    '5GBvcHhn6p5TGgcKXE149z96DqhcW3j3iVrrotK3SVLH6DGG',
    '5Gj3BikPyDtV9LawkmUERt9YGspHMi57bFwfgDLJSLVzKh5q',
    '5DqomGkuEin5fUHJXFX7HNdgbWGst8LXZM9X3zHmXgRUdrFV',
    '5CkUBgt3sZKaK3itZ62fd5pvbH35DtF4woKurjUFHscWhLHE',
    '5GCEY84ZfdaX7vMbDKVgBgWLQxgmpZ4hcaNDQqh4Ds6rpShn',
    '5GnhGFjJzTazdtiaiu4yTrxK68U3oSv39QhXYx9aKSRBZW6Z',
    '5HGYVMD4cgaPR2AC7z8V2QhHhKmk8oQDBWcMtCfX6aB48LfJ',
    '5FL9SoXaGW76oyiQFWhcgdK2erduSntsTAtg5UGQCQvPRwFZ',
    '5FgXhX9qd5VFwcBaK7P97oPKKmDtLYoanSU1bVG8YGCEQWng',
    '5E57wbG5zd9fcRfWiPemAYfB2fEyFgyiuuQfWqz4Ww8AtKCx',
    '5H1X3WpK97anDkTu1cChqZZW6CrKNakrC31pAA8rmoUkAzbP',
    '5HppfdS3qqGTRJdMP53Bk955h1jc777uj7zcDpAcxxXXqi4r',
    '5FCcEQ4f742zwwzKisagYERYwP5nk3wBxGguzZ17xuQ2cr8r',
    '5CqKx8Zc9o4NhA6CKB5q1efJosKMsBtjyuMkndvMZcrcth6C',
    '5FUdYrWZGTsWm8jYSwTrL5GUeRT5eKavyMUF6iGBZfn8pQPH',
    '5DaDLRdcr6xHHeWJWgh9r1dLSNoC5rrxRbkU6unMPaa6VP31',
    '5Ctb8Q1HYRMTwXA1f1FUxche8YzUQUhGKLnRDLqSSPNHJwzz',
    '5EkPxdrDeeLq3KW5yxB356McFUM2WEbkHgcJenVVssPMhrGB',
    '5H6y3cVqEtgDPPkeaZ5oxUZRNUZEzeiV6J6PM3LYKhbT6Tqa',
    '5FhKWFL9WGohHvnDSFcAns7PGsmTR11ohYH6uk9qwv8kVU2C',
    '5G1oQzu9RF6kpsohNzv71x2GiEMo5w33Cct6XjZLu7stQLwB',
    '5FQrsxpft2Lb6xbZGLdPLi2eATRCuX6cbYvDGRyRYu3HmPnH',
    '5DLXKPetw4f46MRUggEjLsd2kxSZRaH4bpcfrTFiEgxdmeWQ',
    '5G3ZPTtPgaQqQjtHP88dfEGcZHdjHxTJjS32Hui8J1jcxt5p',
    '5Djm5j4aypYgYa4SmyjPNczm5qmFJstVQrM4iiM2cg9a9kbB',
    '5HNQ6pK5zRXQheyUTdfuUQzu6sG3sBgFtLr5pQc8Dz5B6EY7',
    '5DRW7oRTu8zQSdpg5eRUyTE1NcYqJvCpY4VBoPawv5VUCXKe',
    '5FeaMajU8YsCQ9eskLFMYw1qfDyWcU6xam5VBurXniAexsF2',
    '5D78kEvnXCDUASk6uUv4kXUoDPd5tFYRHyMM2uAXLtgX6WNx',
    '5EFg6koK32dR2iYArd77a6C3TXHCofZtz4ZTDXA4wJGaDimv',
    '5EcXmwnmaHy9u2N4NkL7CaxnLYcFQSyoL8N6kV18FkkYqtFW',
    '5DLpXC5S5LGgLtGpdNdFijkLekp6Az2srKai6SvD1XLTdxfY',
    '5HbZ8KD1ju8Hi1KGB8BeWiPkFPQJSQDuTaNGWe9A4KqZexFB',
    '5CevsEa1ZZNNYyG3skp5iuKomqPeMm8SFpUSjhumh7Pw7Aj1',
    '5Fh1i4fUJGM1Xp4XrTRDS8KG1xgZUBFC223DCnu8zTxXKGat',
    '5Cz5gtPZJJEV39Km8JZzsj2JWZrG4QwFernWfvBijXjAHTJu',
    '5DqKSj7rGJDYcvUAFLFG2g3JeRjrojQdWUnJ4BGMKwMZNasL',
    '5CLeg1M3MPxQ7kLZ9jM9khVTpKnEKTWLPgZENr3Gk821WLuk',
    '5DWxXGkvn6MnTec7bwxfyVWR9mZw6T63CnXSSXcnLUtcZYKV',
    '5F9ShouAuy4hL1fjncBYwsE2BNtFhGgU6pk4yuUdTmwwatFj',
    '5FTtrmSoU1KV9F7BbaK7Hr8RXZ48aWqGV3mcyjaezYiXrLMF',
    '5HTaMisA15Wx5VEfdb38VDobsXWmurR9jduyW5tBop64gDEx',
    '5DNpKo4KLt5V8QKeYLXf71yjkwEpx7YaojYX2P11nYLW8d3K',
    '5HNgBmFW21URfGftZXktsbnSpQUYV7bLMntyi7VXFZHxc6YF',
    '5GxcaGzvxLPhRpeK2ejQgRX3HrBhNWj3n8DbckTHm56enDQF',
    '5D5hzktStakBMVMfg4vqgt1R1LdgyfvvT3HcVrhQT8CW3atT',
    '5CJVBNuMmBuk75kN7txiJsGZL1WBTRxWxZEvwK7HL6khp2Mp',
    '5HZ81uTgewQsDXJTR6oSK9AejbZZCafg91np1kccG2aXg8eH',
    '5H5xtXibQpSmRYj9VQZt5LXtQA8NTgyQaz8gbEEQujeUXYyL',
    '5FHPB7zhH2camBRcvXghyApKW54ZKYp76vwToB2BrooBLMjy',
    '5C8P4jEB7Bc3KSpPPg7Bqkf8PLT1PVU1dLotfHWJKJk74fdd',
    '5DhviGKW9DB5ik9qWAHzmtn11jWvfJNSyzvDR4HfAc9Gom5X',
    '5DfZ16Lr8hFvpzm86CtCeT9sa1Zi7bfWgPRAjC69mKxk4eJE',
    '5DLmcx2VfTZMNUdTJduZC4p8c6mnYhYE19J1cxTxEb6ocRDt',
    '5CXD5cXvEwiM4JV3JYgiYfgeVwbhiRV5iE7vsBeXVEEcSfcn',
    '5F49Jy45hFvNiG9JsJN4fcuSSwUitvdymLDd4XBJHNm1sFbX',
    '5FhDFWKa6MSxxB3ZZoMuWE4BJC7meoV9tbKC4MVu3nwskyRs',
    '5ER8YJbFg2EwQRCSuMuPbMLqmPcaEehcVmNaA3ECnyCNTgGm',
    '5DU2vMUUVZYeKGB4eNXP8kDhz86CgcATJAPfoYeK5QrdjYzv',
    '5Fpbw1di9XhZutgK1nZyrDYkmp3DDqMjYMiSzT6JUrMS1hau',
    '5C57VhMYWxzW4cMyaVee8A1tjmRGeEWjaz9gUwrJket1xb9v',
    '5HH2uVdwfJCTZEpHqoEcXtH6UdRkoPtVhAHQg8Nq74KQg1E6',
    '5GZSjNX9KXjN68Bu9KPn2rxC5dDTEte62FHsGGBMAePrWqFt',
    '5FLFHkvmx5YVnanjjhUcLfr934aDry5wQokut2Z7SAMBmnAz',
    '5DyCRXiK1wbNTp5kSuJ7Z3spXJdQ3vJfUoxTJsxuHt7qLbQb',
    '5FkGWk2Hf1uGfpDZ9FuHdKw8RA2JnYssKr76cdCZZZFmnFWK',
    '5FkL7AjapR9w4AKymAnt9Za9v1fxViDXCbWykvQYahNkH31W',
    '5ETnxyUgqdirYSsdc2HpuguEevgwZEu6sgWS2PdTE4SkRdL6',
    '5GZHVcXzyZh6y7N864bdpgDet5pDHDVddTMiiAHVmazZJ4w7',
    '5C7n8Ps346BYWmFK9Fb1fHbx7GtEsmjqDq92bcBcTP1Q1yv7',
    '5FLSZ4YYACAiXooDYXqLcLgurFv1bKdfSdsNgwNEpHv4yqo9',
    '5HQhgxg3zGhKqhhvFDpHd2twua2C6GMKRMfrK4Qi6dbDPACY',
    '5C8UkD3yCAzhhVg35tmETJbobv2ca3CNxEtwTNMnGtD5JaZw',
    '5FJ9UFGJpMCzM6waKemk9jDA2xbuEqCd9S6zmAKobjhKhuvd',
    '5GREzXTUzJWq9m4jZquJQsiKBJq1nSGJNqntfG15JP1pZZGy',
    '5GzqFrLL9wNMUXsUkfYHihczuGkmYLnUqiZw6cFDPPrpYMuB',
    '5HePnRqjxWe3a1xwUbMfT4PVh4EEfwVzmrZbmtfB2FnQNds8',
    '5EWrKecg8PoaroSZBXAFGWA8Ga5FD88NrB2kNGSoJzJKuC54',
    '5CkJw2u9AJvM3vjswubWsqijEJLA9PmKbrJ6kJK7AQ8tK5rm',
    '5G95ZHbZjQE382BQm4czMsBUAUY2eYpERosjjUvx6k5jBTbr',
    '5EtUqfZoXU6Tu2E27oLbsuV6Y6Z1tqD8tEeD9f3ESwGKhx8W',
    '5CLwHP4deFZjphybrAFU2x515qC3zKvC3kowTDBXFq9gdGSi',
    '5C7LPB6GzcoNZUWwZL9yaUojrNVp9BTDhJJ571G4dkJBEkNk',
    '5FRasYmtj4e9DBSPsYEdeEYZ1EKRiaFxiGV3Wo2EbX2zs6Pm',
    '5CwcsmwujsjLaD7GjcJs2z5xMSxCT2uKwUr8ZkAjhd1Mmuhi',
    '5CfmEH7raKuwRvefJk5EsqT16b7WBmRoBwv9QyzVJAJbYZCk',
    '5F1EgKBvTibjkh2wvmh7gLuFz4KR9iDam1nE4zkU8SZmToki',
    '5EvUGP2DiM2EutCNXA5vJcN2RAtQ2vNsKQqxXGaGGBYkoPFq',
    '5GMv1YmGk6Pkdiqa68VCLjs2uPvBh6iGNhu3VekgfLWqNcKm',
    '5FKuWSi2UUdxhcwZnm2z6KhxhV1TEDNCYmXZwYavCVLki2m7',
    '5H1dbpCbWY1PJNBXYb8qnYuxV9k7GpspzW7W1PiHAy1uRMbF',
    '5DyMWumHpQACUsMe32absyWYUmE8SDeGYWEPq3YysYh3TdFa',
    '5Hh9pnBetfyreHmvrcU6NUzdjz259CXuFKSJ6rcjYbWwVebW',
    '5G4RKu8kR64qMzoCHYXjdwEh57Cb7mfk1wcvSsfzqmWAsY4t',
    '5DJ8L8hFb4h1TJsUgbUZd6mCkvqtHDa72oViWJQMuKK2MUSa',
    '5ChkNoa83WprMz8qv8vzjtWWQG1t61b1tVWD2do1r6xbbL8q',
    '5Gk645nUYwhgBj1KFX6StynZxyWiPG2ogSa1oGG3CbqM4pB3',
    '5EjutSBmixLd1NLbir57BCctxpv4Qt6j54ooPCtMLPLToffq',
    '5EPBwupP7EFqtZ8XC7RmRSaQj7j99PzrTyNjyFK53S5jPFej',
    '5HijGR4UAB23pTG5Av9RbQXuB9gsTnTWTCtq96Mc3gKbab55',
    '5GQmRXBjdXwRTvtDCfaY7YyqHgb2qaPKyeSPYeV6s2RUReUC',
    '5EvNr28AdxVBomsKMjn33WgCNzuyncsnBqYe6EEQFQsV6iWi',
    '5Da4N3uaZ4okf1VW6dWkrvgYbuU38dzgoisQgXpSqEtYNX1o',
    '5GhChz4X3Ym3vZyqPu6CA4ryaNjbFpBsFZteBs9j8sXvVVYD',
    '5FWJ7uwwPe6jGi6VTqzTbC5MFXrFYMen7hg4B4VKCHeUeqXz',
    '5DDLJtczK7BGwxu9tYw11kC2KrRPRvbz8B56qZ6wbdS5fX2d',
    '5DqB7TFh1DxR62s1GFs8Y6f18wzNRC15nExDcHAvfXbyCVk1',
    '5ELLpMp8RawAnwNrFoXcUmZ6A7LZPEGVcyAa8AcL7dEvG21D',
    '5EcgqLAwxz5SwogKFCTKp6NCFzPMGgSvpLD7DwAs8ehJqXn1',
    '5DyFu91u5hsBpW7cB1CXF3xbvvaVAtyvkK4P1Bn428BVj3jw',
    '5Gbr2pnfMwJwvZ7izVtFpqCeFTZCE1jgeGhoh9nwFzDFDVTZ',
    '5GNqEnEEiTMkQXAL7qHxyVdZjp6dSnZU5QQ3nWMtLTowv6th',
    '5DyJREb3Ydn6qTF5fyH9wzrKYmgSSCx4P2WHWMRHn5T8LSFi',
    '5CPo6Gj2gqHJdNH8BHfGnZhLXitffwuwuYGMLsA3txfK36Dv',
    '5HH9tMCfUvr75tziKt8AUsnSzBrLS9grSXRGTAPhMMFDguFA',
    '5Evg1EkosEp9btsuRUgRyv4GPazswkyhjwgUnJuYQY9PYAX5',
    '5F2FwYroByzHEPRq6ouJP1Z4rEvhTkxRju9J472FYuxFakek',
    '5CGU84QCZF9U2D5a4t8Mym7M356gJkLi2ShN65gRTgoW5Sky',
    '5DnvVfhrEQ6NuEnQRfh9ZZxkpmUGNZ6dasKprRHFNzkG3hF1',
    '5CSj1tzj4ApCmtTt4wqGSmGxhp6yrxmZn8WoLa4f4dSJpijk',
    '5EqJcrTaqkNvN3hX4qKQdGsgdXARA5Kf1oxPuA6E1brYzJYD',
    '5CoUjQnis8bumbZiSgH93M3iSqQrdszJopz68QwBqLkNeCKU',
    '5HR9MpxP7U6XhqbdhvwL1c1aLCirqn5FCgn3i6tqw7tQrmvV',
    '5GEFeT8B3SVyvtkVNFv3LkAVeX5jZtKcT9GierwWqjiMYFQH',
    '5DP7XQyrGo9RbH5o2omYS3mukAm8UDtvVjSGzM4Q6sF7P2AR',
    '5GL98k24K9uGJZKAeWvneHvEWpjos3AEetmrAhehxruUMSMd',
    '5FL9aTV5yovcVeyZJ7mjKzS3yt4fKmgWvp1vfV5XiC2xgbo4',
    '5DCKPfzEmsg41SdkV1jctqC9YMjRdvc1wqUWrbRU6e93R1ZV',
    '5HWd15Wp5Cse3aWeMDA7v6Sdwv8RAQjuCuFyYfwxHx42wgFY',
    '5G8vm7yBr5iv9UgVWxNPztx4W6CJiGLq6Ua7ErBYHa34Do6M',
    '5D5TRPq38VTjNkwbPAwfeCro2nHgtHT8UJXPqzDPzB5ZxdKv',
    '5G46yLVUoHRLiLYErxjLGqmDF3sSUMrjavEnx3vqy9jVxdta',
    '5F9JCS5Ni7kgBiZzBgc1b7t2Px2jnDfizoGYtBwTbHEGQayf',
    '5G1ukoi5qKzTZkZJmanDk2eWngmYSCVHcYVoSgrcbfWi8oCG',
    '5EcJ6HUJFX2Rs9yexpn7SecwW3W3YKwqrRgVB5YfsYnStM12',
    '5C7VgoejytDpGQEY47LYCHxGwsfHhXLHiivbwfWXA2esv8kr',
    '5Hq1wEcZ7Qrz4AS8f7SAqRyy9DDbopw9Z5Qjfi9jZ5ui5aCX',
    '5Ccxjpbwygc4aTeuuhorKa6UkYyzKegqaeFQut9XgGzR9SEC',
    '5CewZmuKofUqbpUBAiXWxHPK5VYZhUMHtdDdWWBUchzkM2h3',
    '5GTYN5fFbdmgsDjmHTuvcB9ujp3A6J3GJ9K9hDqLaHz6yXAk',
    '5CAAMaaPt2Kr2zUEzNKcCTbojcRvtX3Ee8sqQXwwXimyyipB',
    '5FhU1mY8KEgzurwtxAfFwEF6otoM8hGS5MJyqTXuQyhkKhk6',
    '5FNLNS1zZaPnpx1TDUxnfRyU1R2V3hAzXpGAHP5Dxz4SqG6u',
    '5GBTBBpQ1hDJrYciu83y8hUEt4fbDew9LDZZUVJNxcRyVjjw',
    '5FjhbbvJzMj1q3vgqQQ3Aob7dhXtzbpV4ebQbfWWLhvy8rh8',
    '5DoFfRzfaJjbvd6KqM7Hgxy6iofFksSLRFRpf15zTgXvHxoc',
    '5ES3RDpnjWkg6RVMj4tZWMNx3FPNnMKomAqPtu1K62PdhQb2',
    '5G9xa3A2SW3cCQmiapRfRtbWSMxLhhzJdoUFY3xovViHQzYt',
    '5G3qMydAg91W81vofspf7HTHyxt2RtZ27uZd6YZ8MftqDso7',
    '5GrzZcVA7efWvhXmxS2RjeAuMNanPEKUS9SramBKM6RoiCQA',
    '5DyEBK76DAaKGF3ZXF91PGRomHMm4eRh3drHByqTXK83tReG',
    '5GdhK2AVXq2uAcrAhJezQcPhL3aAkzyrThWmTuPnQP33EULh',
    '5HiYBFgehKabGUT9FQfVGqxdHdgygpMTA7xzK3xHbMBNaTCY',
    '5DDCCJFKEv2a42b63FxA2C5CRMjmhdtaCsAs7HithCpjqrSR',
    '5GNZ6LHDeGhkoPXEHNg4wTPozYarfhPA2HyBqyPNVD4qf5mg',
    '5Dz6uAcvS7NPGhPK6KV27Bta3VYQQv6yuGCnv4BK3QuDL55a',
    '5HWCV5DZERcZYZo75QnKveHb1TY8B8VXMncMD5urjJsnHkMM',
    '5F9E76Y8rzZiBbDyTMGRA5hpXBny4TGmndFJpnM8DwGCebfW',
    '5DkYWkKAvtBFRWaZxTsrhRZtXQkumTLX8vxogh2tLh2GLqW1',
    '5H9Rqo7UNZFot553SPsvGkLCDcfTDQfqBRP6MvRgAtfSNg76',
    '5GYfkRU4jyZAjmiUugyJetcEBqJe8xXY5UkpyPj3ASr3bwwx',
    '5EZLisG16XgCWCSTv2Ff5UoqeRc7fQZSwWQzgmf6KV1G5gCi',
    '5FyP2y4w7Deti7bXBCWFT9Z6EzLqFtpDb1BLHi6HcWHjwB16',
    '5FKpcPVqSNXLWL5Zzi1UrRQkU3NJ8CZ2D9TAp8dyfR6svpy4',
    '5DaYQYaBPsFLegvNnMj8BsnLgERqMbNF7A7Dmicm3TJYTr2M',
    '5H4DpFceeobos75nCkt4oRjbpzWUHMHV7b5jFEDeFEX6hJB1',
    '5HKqXi6WBtkFQywFftM9kMNXSeHVzKPwpNqLcs4LDhcNQQJE',
    '5GNco9hKYKFwmisyKiEMZ7ydsHdSkcwsJTwkP6d3pBwoDGkP',
    '5FA2YrLxe57vQTCoMp77EZyh9BcnpYE5QyTuYuZL6BsgNDGZ',
    '5EZs9D18TeVgu2fjw9HsWg2JycydKRSvYgxsv3JbANzJqBdQ',
    '5HbvvUsrYhgaFSaDfsG2WE45HWWFQuPjg4FWqzt4asAMSq2N',
    '5FNejeYaHmrQkyhTrZAGgf7tt1sv2kwagUnfMDDY15GeS8pn',
    '5Gk2CSP7MCQqpbBY978n9zNuaprDTgK85LoTBEvPrgoeBjzn',
    '5EhjbKRFpY2oG1LmdUEbKUEwzVsYgcZt39Ridw5zggqLNoxj',
    '5EfPF3NJEtbieAjPHqFXFkZf6xb1goesAibsRePdjqhYBKFk',
    '5FUTg5n4tMTBfdmifk4r7bvCBLMatWP4kuwqkJbniQrpic3d',
    '5HKswTN185AKa7Dt8zCPUzksbJKSsZZFCqGXWsHnBe4mugYW',
    '5GU4TCSfpPfftn258HNSofouZn3DN2bwqnMTDAiUjJzqfSu2',
    '5CJbyx3Edp9rjZoaUyhSimBnUUFuwEpj5BMeQwzD7y1Wqnsi',
    '5Ef2PQM3hKgwdqTsojDkyTizeuA4JQ9xDZq4Nr2A9rmSaMVJ',
    '5G9eWgQS1Rbg9BUCpkBeCPB8ELHzV7MUKc4npsVNBYzrEV2x',
    '5HU3fDQCANygCj3MWVTnHCEYeokuiHF184HXAEoUZDTcx8bE',
    '5HYySFRdS6993Fxsv5tPR3Vu5Cj5db4YghNJfYG14NR4CprA',
    '5FYeCGrojkMU7in4oaK8Dym7dksn5KVmRhKexedhAe9mNvk1',
    '5C7PyNsL4XX9m4ArsgoeA97jLwPdH2hWFth2G1BVRYcGzAiD',
    '5DNxPox6ZbQTFrM4XmAqzBQCHXeKzwFdrp7RBR28c5FJKqgQ',
    '5Dfd4Hyc8j5cVP5vQLdjs5C1zRJawWqkAKCn8iovCyXBf5Fd',
    '5GmadBkkBNpFCd83crepSEfvRW5CNMfb3CQVMxV3ZQXaqZgd',
    '5GioqMCnX7Qxa96aj9s5GoyEExYyCZQdh4Q4D6WqVee42ACi',
    '5CfidohYyMkJsuNH59V9YwURgt81JJL2HgXbUBkC3SQbz5QY',
    '5DoKu3MEV3FDoaKzfeBygTpaXm5Q4owR8NzGoJq2fWyABGx9',
    '5Cfx6zeU3XUozzy4o3oG9DU92njrbVfoiReZMH4uFajf4kvr',
    '5CMMHqV2chqrqdBJ7rQR9R5dovVSwkja4SdHehE9S3p45gND',
    '5HpvEVQBrqrLA63bzPiZcrT5d9AbRC8Mu5gtp6Zfck48iBAc',
    '5GnJbzzM4PzHYErcrgzVaJ5BopmkvAVSu5nB6pkKr1MLAa6E',
    '5Hmnu5e5afDNERfbe7Mw5etKkkeDtYpqCFU41HywosPZazNM',
    '5G9imJEefNYpQcnskPxW7Q7Zz8DP2NZ3tKgECCUkxq2eize8',
    '5EcUMYqGLPQJ4c5owRertXYz7BitTW3uMsu3mjZmNqkjsSmi',
    '5CJZWKA7UTBjQYYzfUzUWhsJ8pLGqj3SMpioEzC5fkxrPEaN',
    '5Fs1tauWTtBu8bcaBbJiyDUTmgfB2ZLU8chr3GGSNN9YqaJX',
    '5EcLt4QFcKirJz6HQGjj9TmQozb5puvZZPwVPUPHspjeJGWE',
    '5Eexg2gn4TC6AVtHFXLe4rrU99CjGSQVLSJQGZCGjrTuGDX3',
    '5EjZr2xn2FiG2uPgL6HzdyQR3BSgWu2ucRsrkqnhgWFww9ex',
    '5CkqxoFCNmoqo9ne5FAQph3QN9gdZMwZZRit7Cams7sqXSom',
    '5HNb8tAEmTLA9uFoCf7NBCcS18Qh8AWFMcMWjXjVkCWxgUtH',
    '5EvfnFcwL4aFefHy13iPAsbQTx1nKr3NY5wSXjAwTYhQDpcX',
    '5CB6kpCrgx3gkMjLXHMhza8d4qwJjGqtPrE17Zpbb6ZbCeQ3',
    '5GCJLvt4bP1pgyEWjXwpwwDT49EALa1x5wxsThpXRgSvswkP',
    '5FhbNwP5eQHA1vLMBhzsti6ygesCESc9QjP6jU3sjnRMS3SJ',
    '5FTcyczmbLeAKQYgTt6XkkkKecUzeHb4aYZyxPDNJDb9qG4D',
    '5HYvHHcKHYQ5h7QFgxcv8rcvV6XHNtUwT7sxfSzqbQePd7fX',
    '5EUJX1AzCpMVyNZ4DuQbfZgnGqyYjVKBpLK7wS7EfKonHjpW',
    '5HVxqVDVzw1DSqYeQW5mYK4QQUP7fGQ4yKbcVhufB42ExRim',
    '5HBR3ToSDfzrpkvujfkG3hBJPuExPfWqPRd1XzkCLJYae6V8',
    '5FPD2YkkBRkAjGj6sp1zT3j45fL4V13KC234Z8PXgHFkfxds',
    '5EFeczu5mrZzSCtw2A8VkjrjuP1Rdc7K49KozA6c3hZeJP4X',
    '5Cu7myYZVMXoQmW1PmdP1s22Rj6UPBXs6a3LCMECDF6Ez4TH',
    '5E1cfvUPE1vNUvmc5SY3P6qvSDBLZD1WR1M1ZffQgUnd14Np',
    '5E7kjvbeuZLv4ZhHernrwEdbovonENfHXwK9iUzcy3Y9Yrxc',
    '5Co9thaWKXF6V2ypKptQbfZzWn7pbQhRGyfsWHsYwNusZnAv',
    '5DX9Ub5U7WWcFpUiuWM5ea2Dy646owRTF3ZDDsfVc2Tz9Vbo',
    '5EboGdTJLef56UDRZRE55dL6THHmeg3iSQJe5KFDoDKb3HBc',
    '5Fe7d2L5eprijhdtyZu33ea7J2VKwQ5hCog2p9Wsp2Kd3bz5',
    '5FeYbNN737AtaxWKyCLXWy2SvgJ6w9QsjiMjLscaC45po167',
    '5E26dxS8aafVqNxt9dUT148Uc2F6PdveAAqRb5KnMTBomSst',
    '5FxdRsC7jVmHQz4VY1YhGdMwSWMeo9JqJSQNtMv67CY2zF7W',
    '5EAGTFrxBpFAhmXrVSzjtX2yNVJnPfZdSQAXWBPsCnMSUvTc',
    '5CZa3d6hjSGCvwLbremsn1RNAX3aGpubCPW1SAJW6afWqv2A',
    '5ECDtQgTZv4F36ek8YheJyFy4kF4yPPb9vkna3bTesBcYuKL',
    '5CvniC7CcAqRsGxywpjWCo56HLZuGpBU8pTacGCtkTWuM8hY',
    '5DeuVFS91Ek3Skk1Z5GiH2TH6hkSAXyHQcqQNxzAPfR71kJQ',
    '5FLgLcdzdKodkbdVia6EQLgYVZ6hbhNtB1NSSN55J1n4EjYm',
    '5DnVW7YA1FijiSMA16VPtnn6owGjCz7dkpMm4w7Zb9wxXAPn',
    '5DJ5Mrt71VTX6vP3qJPzhP7RFr58veKAMV8rBCicSn9TwDtY',
    '5FNCEchmw9bWjhheU6Zet2g9a5BGJf9QpTqahKcHRkgFPn6v',
    '5HpDJvAssj9yuHnt8DbXW11AWXXGpukYBFV8T3RKBRo8WBWD',
    '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw',
    '5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY',
    '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    '5GQt1sgm9ftiWByQc4WJYyXfLw6HJZigDXx7hLovCJ5sigjU',
    '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
    '5Gsi4qPNX1CyxMVm22tteG4EHLSJwuGCBBCJgUCF6bP26Jxe',
    '5GTbgZt29a4TpseAaXkABrCVRssK4B8wVbzyuuJzjCP7Kim4',
    '5DP2Um3uLJFYkfoFP7jnU2hXZNRMFfvyTco8USeQaFHevfEP',
    '5H3gAzCU7jATwcD47FpYwz1ZJbzE7qk9tBCVLa7HWpRpUWL1',
    '5GtnV5Ez7aL1JTLkWydnnG2C5H8FD5rXWesP6nwtDKRBfvbj',
    '5Ff9y3FDTCNReWM5M8FWXHRENPSTczLVmDUZfgTA9fSWaHVb',
    '5EemRnubSCMs3fdjsxJbvLmAwFE2ocsaJUsqsmLDRUYxMxbi',
  ])

  // Get initial balances of accounts (free + reserved)
  const balances = await getTotalBalances(api, allAccounts)

  // Any stakes behind active proposals
  const proposalStakes = await enumerateProposalStakes(api)

  // For every stake id (associated with a member id) increment the
  // member's root account with the staked amount
  incrementMemberRootAccountBalancesFromStakes(
    api,
    [
      ...proposalStakes,
      ...storageWorkerAccounts.stakes,
      ...contentWorkerAccounts.stakes,
    ],
    memberAccounts.rootAccounts,
    balances
  )

  // Sum the total balances and filter out accounts with zero balance
  const exportedBalances = []
  let total = 0
  for (const [account, balanceBN] of balances) {
    const balance = balanceBN.toNumber()
    total += balance
    if (balance > 10) {
      exportedBalances.push({
        balance,
        account,
      })
    }
  }

  // compare the computed total balance with total issuance as a sanity check!
  const totalIssuance = ((await api.query.balances.totalIssuance()) as Balance).toNumber()
  console.error('Total Exported:', total)
  console.error('Total Issuance:', totalIssuance)
  assert(total <= totalIssuance)

  console.log(
    JSON.stringify({
      balances: exportedBalances.map((balances) => [
        balances.account,
        balances.balance,
      ]),
    })
  )

  api.disconnect()
}

// get sum of free balance and reserved balance of accounts.
// council participation stakes are 'reserved balances'. So this method can be used to get
// account balances of council members and backers account balances.
async function getTotalBalances(api: ApiPromise, accounts: Set<string>) {
  const balances = new Map<string, Balance>()

  for (const account of accounts) {
    const free: Balance = (await api.derive.balances.all(account)).freeBalance
    const reserved: Balance = (await api.derive.balances.all(account))
      .reservedBalance
    balances.set(account, free.add(reserved) as Balance)
  }

  return balances
}

// enumerate the member root and controller accounts into a unique set
async function enumerateMemberAccounts(api: ApiPromise) {
  const first = 0
  const next = ((await api.query.members.nextMemberId()) as MemberId).toNumber()

  const rootAccounts = new Map<number, string>()
  const controllerAccounts = new Map<number, string>()

  for (let id = first; id < next; id++) {
    const membership = (await api.query.members.membershipById(
      id
    )) as Membership

    rootAccounts.set(id, membership.root_account.toString())
    controllerAccounts.set(id, membership.controller_account.toString())
  }

  return {
    rootAccounts,
    controllerAccounts,
  }
}

// active council accounts, backers
// current applicants and voters are all enforced by runtime to be members.
// In the odd chance that a member changes their role or member account during
// an election or while in an active council
// we we need to capture the account id this way.
async function enumerateCouncilParticipantAccounts(
  api: ApiPromise
): Promise<Set<string>> {
  const accounts = new Set<string>()

  const seats = ((await api.query.council.activeCouncil()) as unknown) as Seat[]

  // Only interested in council members here.
  // backers are stored by member id, so are enumerated by enumerating member accounts
  seats.forEach((seat) => accounts.add(seat.member.toString()))

  // If there is an active election include the voters account ids
  const hashes = ((await api.query.councilElection.commitments()) as unknown) as Hash[]
  const sealedVotes: SealedVote[] = await Promise.all(
    hashes.map(
      async (hash) =>
        ((await api.query.councilElection.votes(hash)) as unknown) as SealedVote
    )
  )
  sealedVotes.forEach((vote) => accounts.add(vote.voter.toString()))

  const applicants = ((await api.query.councilElection.applicants()) as unknown) as AccountId[]
  applicants.forEach((account) => accounts.add(account.toString()))

  return accounts
}

async function enumerateValidatorAccounts(
  api: ApiPromise
): Promise<Set<string>> {
  const ctrl = ((await api.query.staking.ledger.keys()).map(
    ({ args: [id] }) => id
  ) as unknown) as Vec<StakingLedger>
  const stashes = new Set<string>()
  const controllers = new Set<string>()
  for (const address of ctrl) {
    const controller = address.toString()
    controllers.add(controller)
    const stash = ((await api.query.staking.ledger(controller)) as Option<
      StakingLedger
    >).unwrap()
    stashes.add(stash.stash.toString())
  }
  return new Set([...stashes, ...controllers])
}

async function enumerateProposalStakes(
  api: ApiPromise
): Promise<Array<MemberAndStake>> {
  const memberIdAndStakeId = []

  const activeIds = await api.query.proposalsEngine.activeProposalIds.keys()
  const pendingIds = await api.query.proposalsEngine.pendingExecutionProposalIds.keys()

  const allIds = activeIds.concat(pendingIds)

  for (let i = 0; i < allIds.length; i++) {
    const id = allIds[i].args[0] as ProposalId
    const proposal = await api.query.proposalsEngine.proposals(id)
    const memberId = proposal.proposerId
    assert(proposal.status.type === 'Active')
    const maybeActiveStake = proposal.status.value as Option<ActiveStake>

    if (maybeActiveStake.isNone) {
      continue
    }

    const activeStake = maybeActiveStake.unwrap()
    const stakeId = activeStake.stake_id
    memberIdAndStakeId.push({
      memberId,
      stakeId,
    })
  }

  return memberIdAndStakeId
}

async function incrementMemberRootAccountBalancesFromStakes(
  api: ApiPromise,
  stakes: Array<MemberAndStake>,
  rootAccounts: Map<number, string>,
  balances: Map<string, Balance>
) {
  for (let i = 0; i < stakes.length; i++) {
    const stake = stakes[i]
    const rootAccount = rootAccounts.get(stake.memberId.toNumber())
    // All role stakes must have been for members so there must be a root account
    // in the rootAccounts map
    assert(rootAccount)
    const stakeInfo = await api.query.stake.stakes(stake.stakeId)

    if (stakeInfo.staking_status.type !== 'Staked') {
      continue
    }

    const stakedAmount = (stakeInfo.staking_status.value as StakedState)
      .staked_amount

    const balance = balances.get(rootAccount) || api.createType('u128', 0)
    balances.set(rootAccount, balance.add(stakedAmount) as Balance)
  }
}

// Active worker role accounts and stakes. We don't check stakes in applications
async function enumerateWorkingGroupWorkerAccountsAndStakes(
  api: ApiPromise,
  group: WorkingGroups
) {
  const module = apiModuleByGroup[group]
  const workers = await api.query[module].workerById.entries()

  const roleAccounts = new Set<string>()
  const stakes = []

  for (let i = 0; i < workers.length; i++) {
    const worker = workers[i][1]

    roleAccounts.add(worker.role_account_id.toString())

    if (worker.role_stake_profile.isNone) continue

    const stakeProfile = worker.role_stake_profile.unwrap()

    stakes.push({
      memberId: worker.member_id,
      stakeId: stakeProfile.stake_id,
    })
  }

  return {
    roleAccounts,
    stakes,
  }
}

async function enumerateRewardedAccounts(api: ApiPromise) {
  const relationships = await api.query.recurringRewards.rewardRelationships.entries()

  const accounts = new Set<string>()

  relationships.forEach((relationshipEntry) => {
    const relationship = relationshipEntry[1]
    accounts.add(relationship.getField('account').toString())
  })

  return accounts
}
