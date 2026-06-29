import {
  PostWhereInput,
  SortOrder,
} from "./../../../generated/prisma/internal/prismaNamespaceBrowser";
import { CommentStatus, PostStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import {
  ICreatePostPayload,
  IPostQuery,
  IUpdatePostPayload,
} from "./post.interface";

const createPost = async (payload: ICreatePostPayload, userId: string) => {
  const result = await prisma.post.create({
    data: {
      ...payload,
      authorId: userId,
    },
  });

  return result;
};

const getAllPosts = async (query: IPostQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder ? query.sortOrder : "desc";

  const tags = query.tags ? JSON.parse(query.tags as string) : null;
  const tagsArray = Array.isArray(tags) ? tags : [];
  console.log(tagsArray, "->arraytags");

  const andCondition: PostWhereInput[] = [];
  if (query.searchTerm) {
    andCondition.push({
      OR: [
        {
          title: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
        {
          content: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (query.title) {
    andCondition.push({
      title: query.title,
    });
  }

  if (query.content) {
    andCondition.push({
      content: query.content,
    });
  }

  if (query.authorId) {
    andCondition.push({
      authorId: query.authorId,
    });
  }

  if (query.isFeatured) {
    andCondition.push({
      isFeatured: Boolean(query.isFeatured),
    });
  }

  if (query.tags) {
    andCondition.push({
      tags: {
        hasSome: tagsArray,
      },
    });
  }

  if (query.status) {
    andCondition.push({
      status: query.status,
    });
  }

  const posts = await prisma.post.findMany({
    //  searching / partial match

    // where: {
    //   title: {
    //     contains: "messi",
    //     mode: "insensitive",
    //   },
    //   // not ideal for partial match
    //   content: {
    //     contains: "Messi",
    //   },
    // },

    // where: {
    //   OR: [
    //     {
    //       title: {
    //         contains: "Messi",
    //         mode: "insensitive",
    //       },
    //     },

    //     {
    //       content: {
    //         contains: "messi",
    //         mode: "insensitive",
    //       },
    //     },
    //   ],
    // },

    // combining search (OR Operator) and filtering (AND)

    // where: {
    //   // filtering & searching combined
    //   AND: [
    //     {
    //       // Searching
    //       OR: [
    //         {
    //           title: {
    //             contains: "Mes",
    //             mode: "insensitive",
    //           },
    //         },
    //         {
    //           content: {
    //             contains: "Mes",
    //             mode: "insensitive",
    //           },
    //         },
    //       ],
    //     },
    //     // filtering
    //     {
    //       title: "Messi 10",
    //     },
    //     {
    //       content: "Messi",
    //     },
    //   ],
    // },

    // pagination
    // take: 1,
    // take: 2,
    // skip: 1, //visiting page 2
    // skip: 2, //visiting page 3
    // skip: 3, //visiting page 5

    // sorting
    // orderBy: {
    //   createdAt: "desc",
    //   title: "asc",
    //   content: "desc",
    // },

    // dynamic searching, filtering
    // where: {
    //   AND: [
    //     query.searchTerm
    //       ? {
    //           OR: [
    //             {
    //               title: {
    //                 contains: query.searchTerm,
    //                 mode: "insensitive",
    //               },
    //             },
    //             {
    //               content: {
    //                 contains: query.searchTerm,
    //                 mode: "insensitive",
    //               },
    //             },
    //           ],
    //         }
    //       : {},

    //     // title filtering
    //     query.title ? { title: query.title } : {},

    //     // content filtering
    //     query.content ? { content: query.content } : {},
    //   ],
    // },

    where: {
      AND: andCondition,
    },

    // dynamic pagination and sorting
    take: limit,
    skip: skip,

    orderBy: {
      // sortBy: sortOrder
      [sortBy]: sortOrder,
    },

    include: {
      author: {
        omit: {
          password: true,
        },
      },
      comments: true,
    },
  });
  return posts;
};

const getPostById = async (postId: string) => {
  //   await prisma.post.update({
  //     where: {
  //       id: postId,
  //     },
  //     data: {
  //       view: {
  //         increment: 1,
  //       },
  //     },
  //   });
  //   const post = await prisma.post.findFirstOrThrow({
  //     where: {
  //       id: postId,
  //     },
  //     include: {
  //       author: {
  //         omit: {
  //           password: true,
  //         },
  //       },
  //       comments: {
  //         where: {
  //           status: CommentStatus.APPROVED,
  //         },
  //         orderBy: {
  //           createdAt: "desc",
  //         },
  //       },
  //       _count: {
  //         select: {
  //           comments: true,
  //         },
  //       },
  //     },
  //   });
  //   return post;

  const transactionResult = await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: {
        id: postId,
      },
      data: {
        view: {
          increment: 1,
        },
      },
    });

    // throw new Error("Fake Error");

    const post = await tx.post.findUniqueOrThrow({
      where: {
        id: postId,
      },
      include: {
        author: {
          omit: {
            password: true,
          },
        },

        comments: {
          where: {
            status: CommentStatus.APPROVED,
          },

          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
    return post;
  });

  return transactionResult;
};

const updatePost = async (
  postId: string,
  payload: IUpdatePostPayload,
  authorId: string,
  isAdmin: boolean,
) => {
  const post = await prisma.post.findFirstOrThrow({
    where: {
      id: postId,
    },
  });

  if (!isAdmin && post.authorId !== authorId) {
    throw new Error("You are not the owner of the posts");
  }

  const result = await prisma.post.update({
    where: {
      id: postId,
    },
    data: payload,
    include: {
      author: {
        omit: {
          password: true,
        },
      },
      comments: true,
    },
  });
  return result;
};

const deletePost = async (
  postId: string,
  authorId: string,
  isAdmin: boolean,
) => {
  const post = await prisma.post.findUniqueOrThrow({
    where: {
      id: postId,
    },
  });

  if (!isAdmin && post.authorId !== authorId) {
    throw new Error("You are not the owner of the posts");
  }

  await prisma.post.delete({
    where: {
      id: postId,
    },
  });
};

const getPostsStats = async () => {
  const transactionResult = await prisma.$transaction(async (tx) => {
    // const totalPosts = await tx.post.count();

    // const totalPublishedPosts = await tx.post.count({
    //   where: {
    //     status: PostStatus.PUBLISHED,
    //   },
    // });
    // const totalDraftPosts = await tx.post.count({
    //   where: {
    //     status: PostStatus.DRAFT,
    //   },
    // });
    // const totalArchivedPosts = await tx.post.count({
    //   where: {
    //     status: PostStatus.ARCHIVE,
    //   },
    // });
    // const totalComments = await tx.comment.count();
    // const totalApprovedComments = await tx.comment.count({
    //   where: {
    //     status: CommentStatus.APPROVED,
    //   },
    // });
    // const totalRejectedComment = await tx.comment.count({
    //   where: {
    //     status: CommentStatus.REJECT,
    //   },
    // });

    // const totalPostViewsAggregate = await tx.post.aggregate({
    //   _sum: {
    //     view: true,
    //   },
    // });

    // const totalPostViews = totalPostViewsAggregate._sum.view;

    // return {
    //   totalPosts,
    //   totalPublishedPosts,
    //   totalDraftPosts,
    //   totalArchivedPosts,
    //   totalComments,
    //   totalApprovedComments,
    //   totalRejectedComment,
    //   totalPostViews,
    // };

    const [
      totalPosts,
      totalPublishedPosts,
      totalDraftPosts,
      totalArchivedPosts,
      totalComments,
      totalApprovedComments,
      totalRejectedComment,
      totalPostViewsAggregate,
    ] = await Promise.all([
      await tx.post.count(),
      await tx.post.count({
        where: {
          status: PostStatus.PUBLISHED,
        },
      }),
      await tx.post.count({
        where: {
          status: PostStatus.DRAFT,
        },
      }),
      await tx.post.count({
        where: {
          status: PostStatus.ARCHIVE,
        },
      }),
      await tx.comment.count(),
      await tx.comment.count({
        where: {
          status: CommentStatus.APPROVED,
        },
      }),
      await tx.comment.count({
        where: {
          status: CommentStatus.REJECT,
        },
      }),
      await tx.post.aggregate({
        _sum: {
          view: true,
        },
      }),
    ]);

    return {
      totalPosts,
      totalPublishedPosts,
      totalDraftPosts,
      totalArchivedPosts,
      totalComments,
      totalApprovedComments,
      totalRejectedComment,
      totalPostViews: totalPostViewsAggregate._sum.view,
    };
  });

  return transactionResult;
};

const getMyPosts = async (authorId: string) => {
  const result = await prisma.post.findMany({
    where: {
      authorId,
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      comments: true,
      author: {
        omit: {
          password: true,
        },
      },

      _count: {
        select: {
          comments: true,
        },
      },
    },
  });

  return result;
};

export const postService = {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  getPostsStats,
  getMyPosts,
};
