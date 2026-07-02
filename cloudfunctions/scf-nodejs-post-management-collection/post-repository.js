const { db, _ } = require('./db');
const postDb = db.collection('post');

async function createPost(post) {
  return await postDb.add(post);
}

async function updatePost(id, post) {
  return await postDb.doc(id).update(post);
}

async function deletePost(id) {
  return await postDb.doc(id).remove();
}

async function getPostById(id) {
  return await postDb.doc(id).get();
}

async function listPosts(page = 1, pageSize = 10) {
  const countResult = await postDb.count();
  const total = countResult.total;

  const list = await postDb
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  return {
    list: list.data,
    total,
    page,
    pageSize,
  };
}

async function searchPosts(keyword) {
  return await postDb
    .where(
      _.or([
        {
          title: db.RegExp({
            regexp: keyword,
            options: 'i',
          }),
        },
        {
          content: db.RegExp({
            regexp: keyword,
            options: 'i',
          }),
        },
      ]),
    )
    .get();
}

module.exports = {
  createPost,
  updatePost,
  deletePost,
  getPostById,
  listPosts,
  searchPosts,
};
