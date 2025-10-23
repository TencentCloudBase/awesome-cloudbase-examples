'use strict';
const postRepository = require('./post-repository');

exports.main = async (event, context) => {
  const { action, data } = event;

  switch (action) {
    case 'createPost':
      return await postRepository.createPost(data);

    case 'updatePost':
      return await postRepository.updatePost(data.id, data.post);

    case 'deletePost':
      return await postRepository.deletePost(data.id);

    case 'getPost':
      return await postRepository.getPostById(data.id);

    case 'listPosts':
      return await postRepository.listPosts(data.page, data.pageSize);

    case 'searchPosts':
      return await postRepository.searchPosts(data.keyword);

    default:
      throw new Error('未知的操作类型');
  }
};
