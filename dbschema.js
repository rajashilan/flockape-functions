let db = {
  users: [
    {
      username: "raja123",
      fullName: "Raja Shilan", //editable
      email: "rajashilan@gmail.com",
      bio: "This is my bio", //optional //editable
      profileImg: "https://firebasestorage/23we23423e2e2e.png", //optional (default uploaded first) //editable
      userID: "234asdnask23das",
      location: "New York, USA", //optional //editable
      website: "www.youtube.com/raja123", //optional //editable
      createdAt: 341234352342342,
      birthday: "5/7/1999",
      age: "22", //(calculated using birthday)
      books: 10, //all these to be used to display in profiles
      follows: 13,
      views: 123,
    },
  ],

  albums: [
    {
      albumTitle: "My album",
      username: "raja123",
      profileImg: "https://firebasestorage/23we23423e2e2e.png",
      albumImg: "https://firebasestorage/23we23423e2e2e.png", //optional (default uploaded first)
      likeCount: 5, //optional
      viewCount: 10, //optional
      createdAt: 1624717777908,
      security: "private | public",
      searchTerms: [
        //used for searching using substrings
        "m",
        "my",
        "mya",
        "myal",
        "myalb",
        "myalbu",
        "myalbum",
      ],
    },
  ],

  links: [
    {
      linkTitle: "This is my link's title",
      linkDesc: "This is my link's description",
      linkImg:
        "https://firebasestorage/sharesite-thumbmails/23we23423e2e2e.png",
      linkDomain: "youtube.com",
      linkUrl:
        "https://www.instagram.com/p/CSB_YoxlK_k/?utm_source=ig_web_copy_link",
      albumID: "234sdsfkdsfsdo3",
      username: "raja123",
      likeCount: 3, //optional
      createdAt: 341234352342342,
    },
  ],

  notifications: [
    {
      recipient: "raja", //who is getting it
      sender: "user", //who is sending it
      read: "true | false",
      contentID: "sjknsdfi324ks", //content can be album or link
      createdAt: 341234352342342,
      type: "album | link",
    },
  ],

  //redux data
  userDetails: [
    {
      credentials: {
        userID: "sdaasfd2342wadasd",
        fullName: "Raja Shilan",
        email: "rajashilan@gmail.com",
        username: "raja123",
        createdAt: 341234352342342,
        profileImg: "https://firebasestorage/23we23423e2e2e.png",
        bio: "This is my bio",
        website: "http://user.com",
        location: "New York, USA",
      },
      likesAlbum: [
        {
          username: "otheruser",
          ownerusername: "original album creator", //this is used when sorting using albumdoccreatedby, ensures it only applies to user's own albums
          albumID: "asdklnasdk323",
          createdAt: 341234352342342,
          albumCreatedAt: 341234352342342, //for pagination purposes
          searchTerms: [
            //used for searching using substrings
            "m",
            "my",
            "mya",
            "myal",
            "myalb",
            "myalbu",
            "myalbum",
          ],
        },
        {
          username: "anotheruser",
          ownerusername: "original album creator", //this is used when sorting using albumdoccreatedby, ensures it only applies to user's own albums
          albumID: "qweio232ksskld",
          createdAt: 341234352342342,
          albumCreatedAt: 341234352342342,
          searchTerms: [
            //used for searching using substrings
            "m",
            "my",
            "mya",
            "myal",
            "myalb",
            "myalbu",
            "myalbum",
          ],
        },
      ],
      likesLink: [
        {
          username: "otheruser",
          linkID: "asdklnasdk323",
          albumID: "qweio232ksskld",
          createdAt: 341234352342342,
          linkCreatedAt: 341234352342342,
          searchTerms: [
            //used for searching using substrings
            "m",
            "my",
            "mya",
            "myal",
            "myalb",
            "myalbu",
            "myalbum",
          ],
        },
        {
          username: "anotheruser",
          linkID: "qweio232ksskld",
          albumID: "qweio232ksskld",
          createdAt: 341234352342342,
          linkCreatedAt: 341234352342342,
          searchTerms: [
            //used for searching using substrings
            "m",
            "my",
            "mya",
            "myal",
            "myalb",
            "myalbu",
            "myalbum",
          ],
        },
      ],
    },
  ],
};
