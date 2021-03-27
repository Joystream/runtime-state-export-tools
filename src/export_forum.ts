import create_api from './api'
import { ApiPromise } from '@polkadot/api'
import { PostId, ThreadId, BlockAndTime } from '@joystream/types/common'
import {
  Post,
  CategoryId,
  Category,
  Thread,
  OptionModerationAction,
  VecPostTextChange,
  OptionChildPositionInParentCategory,
  ModerationAction,
} from '@joystream/types/forum'
import { Codec } from '@polkadot/types/types'
import { Text, bool as Bool, Option } from '@polkadot/types'

// Note: Codec.toHex() re-encodes the value, based on how the type
// was registered. It does NOT produce the same value read from storage
// unless it was correctly defined with exact match.
// Also toJSON() behaves similarly., and special case for types that are registered Vec<u8> vs Text
// `Vec<u8>` produces a json array of numbers (byte array), `Text` produces a json string

enum Maps {
  PostById = 'posts',
  CategoryById = 'categories',
  ThreadById = 'threads',
}

const mapName = {
  [Maps.PostById]: 'postById',
  [Maps.CategoryById]: 'categoryById',
  [Maps.ThreadById]: 'threadById',
} as const

main()

async function main() {
  const api = await create_api()

  const categories = await getAllCategories(api)
  const posts = await getAllPosts(api)
  const threads = await getAllThreads(api)

  const forumData = {
    categories: categories.map((category) => category.toHex()),
    posts: posts.map((post) => post.toHex()),
    threads: threads.map((thread) => thread.toHex()),
  }

  console.error('Category count', categories.length)
  console.error('Thread count', threads.length)
  console.error('Post count', posts.length)

  console.log(JSON.stringify(forumData))

  api.disconnect()
}

// Fetches a value from map directly from storage and through the query api.
// It ensures the value actually exists in the map.
// Note this is old technique before keys()/entries() helper methods were added.
async function getForumCheckedStorage<T extends Codec>(
  api: ApiPromise,
  map: Maps,
  id: number // PostId | ThreadId | CategoryId
): Promise<T> {
  const key = api.query.forum[mapName[map]].key(id)
  const rawValue = ((await api.rpc.state.getStorage(key)) as unknown) as Option<
    T
  >

  if (rawValue.isNone) {
    console.error(`Error: value does not exits: ${map} key: ${id}`)
    process.exit(-1)
  } else {
    return ((await api.query.forum[mapName[map]](id)) as unknown) as T
  }
}

async function getAllPosts(api: ApiPromise) {
  const first = 1
  const next = ((await api.query.forum.nextPostId()) as PostId).toNumber()

  const posts = []

  for (let id = first; id < next; id++) {
    let post = (await getForumCheckedStorage<Post>(
      api,
      Maps.PostById,
      id
    )) as Post

    // Transformation to a value that makes sense in a new chain.
    post = new Post(api.registry, {
      id: post.id,
      thread_id: post.thread_id,
      nr_in_thread: post.nr_in_thread,
      current_text: api.createType('Text', post.current_text),
      moderation: moderationActionAtBlockOne(api, post.moderation),
      // No reason to preserve change history
      text_change_history: new VecPostTextChange(api.registry),
      author_id: post.author_id,
      created_at: new BlockAndTime(api.registry, {
        // old block number on a new chain doesn't make any sense
        block: api.createType('u32', 1),
        time: api.createType('u64', post.created_at.momentDate.valueOf()),
      }),
    })

    posts.push(post)
  }

  return posts
}

async function getAllCategories(api: ApiPromise) {
  const first = 1
  const next = ((await api.query.forum.nextCategoryId()) as CategoryId).toNumber()

  const categories = []

  for (let id = first; id < next; id++) {
    let category = (await getForumCheckedStorage<Category>(
      api,
      Maps.CategoryById,
      id
    )) as Category

    category = new Category(api.registry, {
      id: category.id,
      title: new Text(api.registry, category.title),
      description: new Text(api.registry, category.description),
      created_at: new BlockAndTime(api.registry, {
        // old block number on a new chain doesn't make any sense
        block: api.createType('u32', 1),
        time: api.createType('u64', category.created_at.momentDate.valueOf()),
      }),
      deleted: new Bool(api.registry, category.deleted),
      archived: new Bool(api.registry, category.archived),
      num_direct_subcategories: api.createType(
        'u32',
        category.num_direct_subcategories
      ),
      num_direct_unmoderated_threads: api.createType(
        'u32',
        category.num_direct_unmoderated_threads
      ),
      num_direct_moderated_threads: api.createType(
        'u32',
        category.num_direct_moderated_threads
      ),
      position_in_parent_category: new OptionChildPositionInParentCategory(
        api.registry,
        category.position_in_parent_category
      ),
      moderator_id: category.moderator_id,
    })

    categories.push(category)
  }

  return categories
}

async function getAllThreads(api: ApiPromise) {
  const first = 1
  const next = ((await api.query.forum.nextThreadId()) as ThreadId).toNumber()

  const threads = []

  for (let id = first; id < next; id++) {
    let thread = (await getForumCheckedStorage<Thread>(
      api,
      Maps.ThreadById,
      id
    )) as Thread

    thread = new Thread(api.registry, {
      id: thread.id,
      title: new Text(api.registry, thread.title),
      category_id: thread.category_id,
      nr_in_category: api.createType('u32', thread.nr_in_category),
      moderation: moderationActionAtBlockOne(api, thread.moderation),
      num_unmoderated_posts: api.createType(
        'u32',
        thread.num_unmoderated_posts
      ),
      num_moderated_posts: api.createType('u32', thread.num_moderated_posts),
      created_at: new BlockAndTime(api.registry, {
        // old block number on a new chain doesn't make any sense
        block: api.createType('u32', 1),
        time: api.createType('u64', thread.created_at.momentDate.valueOf()),
      }),
      author_id: thread.author_id,
    })

    threads.push(thread)
  }

  return threads
}

function moderationActionAtBlockOne(
  api: ApiPromise,
  action: ModerationAction | null
): OptionModerationAction {
  if (!action) {
    return new OptionModerationAction(api.registry)
  } else {
    return new OptionModerationAction(
      api.registry,
      new ModerationAction(api.registry, {
        moderated_at: new BlockAndTime(api.registry, {
          block: api.createType('u32', 1),
          time: api.createType('u64', action.moderated_at.momentDate.valueOf()),
        }),
        moderator_id: action.moderator_id,
        rationale: new Text(api.registry, action.rationale),
      })
    )
  }
}
