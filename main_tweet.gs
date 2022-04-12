function  main(){
  const mode = "TEST"
  const ENV =  mode === "PROD" ? PROD : TEST;
  const name = ENV.LIST.MASTER
  const twitter = new TwitterV2(name)
  twitter.authorize()
  //const tweet = twitter.post("@black777cat rere")
  //console.log(tweet)

  const profile = twitter.getUserInfomationFromScreenName("black777cat")
  const userId = profile.data.id
  const info = twitter.getUserInfomationFromUserId(userId)
  console.log(info)


  //const retweet  = twitter.retweet("1488028448744345601")
  //console.log(retweet)
  //const unretweet = twitter.unretweet("1488028448744345601")
  //console.log(unretweet)

  const postImg = twitter.postImg("画像つきツイート",["https://media.wired.jp/photos/61ce98221e56be923700dd02/master/w_2560%2Cc_limit/c8f078da15f428c770859487d6c4f715.jpg"])
  console.log(postImg)
  const delId = postImg.data.id
  const del = twitter.destroy(delId)
  console.log(del)
  return
}

function search(){
  const mode = "TEST"
  const ENV =  mode === "PROD" ? PROD : TEST;
  const name = ENV.LIST.MASTER
  const twitter = new TwitterV2(name)
  const search = twitter.search("メダカ")
  console.log(search)
}