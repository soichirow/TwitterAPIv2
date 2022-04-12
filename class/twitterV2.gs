/**
 * Twitterを扱うクラスです。
 * APIv2を使用しています｡
 * 
 * ※事前にtwitterのAPIkeyの取得とパーミッションの設定が必要です。
 * 2.0のAPI_KEYは「STANDALONE APPS」から発行したKEYは使えません。
 * DEVELOPMENT APPからキーを発行してください。
 * 
 * ディベロップURL　
 *  https://developer.twitter.com/en/docs/twitter-api/data-dictionary/introduction
 * 依存するライブラリ
 * --- OAuth1 --- 
 * 1CXDCY5sqT9ph64fFwSzVtXnbjpSfWdRymafDrtIZ7Z_hwysTY7IIhi7s
 * 
 */
class TwitterV2 {
  constructor(
    accountName = PropertiesService.getScriptProperties().getProperty('TW_ACCOUNT_NAME'),
    apiKey = PropertiesService.getScriptProperties().getProperty('TW_API_KEY'),
    apiSecret = PropertiesService.getScriptProperties().getProperty('TW_API_SECRET')

  ) {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    this.accountName = accountName
  }

  getService() {
    return OAuth1.createService(this.accountName)
      .setAccessTokenUrl('https://api.twitter.com/oauth/access_token')
      .setRequestTokenUrl('https://api.twitter.com/oauth/request_token')
      .setAuthorizationUrl('https://api.twitter.com/oauth/authorize')
      .setConsumerKey(this.apiKey)
      .setConsumerSecret(this.apiSecret)
      .setCallbackFunction('TwitterV2.authCallback')
      .setPropertyStore(PropertiesService.getUserProperties())
  }


  /**
   * Twitterを認証します。
   * 事前にtwitter ディベロッパーページからコールバックURLを指定する必要があります。
   * https://developer.twitter.com/en/portal/projects/1352079192913920001/apps/20768938/settings
   * コールバックURLの形式：
   * https://script.google.com/macros/d/＊＊＊スクリプトID＊＊＊/usercallback
   */
  authorize() {
    const service = this.getService();
    if (service.hasAccess()) {
      console.log('Already authorized');
    } else {
      const authorizationUrl = service.authorize();
      console.log('Open the following URL and re-run the script: %s', authorizationUrl);
    }
  }

  /**
   * Twitterの認証解除するメソッド
   */
  reset() {
    const service = this.getService();
    service.reset();
  }

  /**
   * 認証後のコールバックを実際に実行しているメソッド
   * @params{} - request
   * @return{} - callback
   */
  static authCallback(request) {
    const twitter = new TwitterV2()
    const service = twitter.getService();
    const isAuthorized = service.handleCallback(request);
    const mimeType = ContentService.MimeType.TEXT;
    if (isAuthorized) {
      return ContentService.createTextOutput('Success').setMimeType(mimeType);
    } else {
      return ContentService.createTextOutput('Denied').setMimeType(mimeType);
    }
  }

  /**
   * ツイートをする
   * 
   * @param {string} postMsg - 文字列
   * @return {obj} data - data
   */
  post(postMsg) {

    const service = this.getService();
    const url = 'https://api.twitter.com/2/tweets';
    const payload = {
      text: postMsg
    }
    const params = this._postParams(payload)
    const response = service.fetch(url, params);
    const object = this.getAsObject(response)
    return object
  }
  /**
   * 画像をつけてツイートする
   * 
   * @param {string} postMsg - 文字列
   * @return {string.<URL>||blob} files 配列で指定 - 
   */
  postImg(postMsg,files){
    const service = this.getService();
    const url = 'https://api.twitter.com/2/tweets';
    if (files === undefined)return this.post(postMsg)
    const mediaIds = files.map(file=>{
      const fileBlob = (typeof(file) === "string") ? this._convertImg(file): file
      const mediaId = this._uplodeImgBlob(fileBlob)['media_id_string']
      return mediaId
    })
    const payload = {
      'text':postMsg,
      'media':{
        'media_ids':mediaIds
      }
    }
    const contentType = "application/json"
    const params = this._postParams(payload,contentType)
    const response = service.fetch(url, params);
    const object = this.getAsObject(response)
    return object

  }

  /**
   * URLから画像を取得する。
   * 
   * @param {string} imgUrl - 画像のURL
   * @return {blob} blob - blob
   */
  _convertImg(imgUrl){
    const response = UrlFetchApp.fetch(imgUrl);
    const fileBlob = response.getBlob();
    return fileBlob
  }

  /**
   * blobをtwitterにアプロードする。
   * 
   * @param {blob} blob - 
   * @return {object} media_id_string - アップロードした画像のID
   */
  _uplodeImgBlob(blob){
    const service = this.getService();
    const url  = 'https://upload.twitter.com/1.1/media/upload.json';
    const respBase64  = Utilities.base64Encode(blob.getBytes());//Blobを経由してBase64に変換

    const payload = {
      'media_data':respBase64
    }
    const contentType = "multipart/form-data"
    const params = this._postMediaParams(payload,contentType)
    const response = service.fetch(url, params);
    const object = this.getAsObject(response)
    return object
  }

  /**
   * リツイートをする
   * https://developer.twitter.com/en/docs/twitter-api/tweets/retweets/api-reference/post-users-id-retweets
   * 
   * @param {string} id - id
   * @return {object} data - data
   */
  retweet(tweetId,accountName = this.accountName) {

    const service = this.getService();
    const userdata = this.getUserInfomationFromScreenName(accountName)
    const id = userdata.data.id

    const url = `https://api.twitter.com/2/users/${id}/retweets`;
    const payload = {
      tweet_id: tweetId
    }
    const params = this._postParams(payload)
    const response = service.fetch(url, params);
    const object = this.getAsObject(response)
    return object
  }

  /**
   * 検索結果を100件以上取得する
   * 
   * @param {string} query - query
   * @return {object} data - data
   */
  searchMax(query, count = 500) {

    const response = (this.is_searchFirst_ !== false) ? this.search(query) : this.searchNext(query)

    this.searchResult_ = this.searchResult_ === undefined ? response.statuses : this.searchResult_.concat(response.statuses);
    this.nextResults_ = response.search_metadata.next_results;

    if (this.nextResults_ !== undefined && this.searchResult_.length <= count) {
      this.is_searchFirst_ = false
      return this.searchMax(this.nextResults_)
    };
    this.is_searchFirst_ = true
    const searchResult = this.searchResult_;
    this.searchResult_ = undefined
    return searchResult
  }
  /**
   * 検索する
   * https://yonoi.com/twitter-search-command/
   * 
   * @param {string} query - query
   * @return {object} data - data
   */
  search(query) {
    const service = this.getService();
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=100`;
    //const url = `https://api.twitter.com/2/tweets/search/all?q=${encodeURIComponent(query)}&count=100`;

    const response = service.fetch(url);
    const object = this.getAsObject(response)
    return object
  }
  /**
   * 2回め以降の検索
   * 
   * @param {string} query - query
   * @return {object} data - data
   */
  searchNext(query) {
    const service = this.getService();
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${query}`;

    const response = service.fetch(url);
    const object = this.getAsObject(response)
    return object
  }

  /**
   * リストにユーザーを追加する。
   * 
   * @param {string} - listId リストのID
   * @param {array} - userIdList ユーザーIdの配列
   * @return {object} - userIdList リスト
   */
  listsMembersCreate(listId, userIdList) {
    const service = this.getService();
    const url = "https://api.twitter.com/1.1/lists/members/create_all.json"
    const payload = {
      "list_id": listId,
      "user_id": userIdList.join(","),
    }
    const params = this._postParams(payload)
    const response = service.fetch(url, params);

    const object = this.getAsObject(response)
    return object
  }

  /**
   * screenNameからユーザー情報を取得する
   * 
   * @param {number} screenName - スクリーンネーム
   * @return {obj} data - data
   */
  getUserInfomationFromScreenName(screenName) {

    const service = this.getService();
    const url = `https://api.twitter.com/2/users/by/username/${screenName}`

    const response = service.fetch(url, {
      method: "get",
      contentType: 'application/json'
    });
    const object = this.getAsObject(response)
    return object
  }

  /**
   * user_idからユーザー情報を取得する
   * 
   * @param {string}} user_id - user_id
   * @return {obj} data - data
   */
  getUserInfomationFromUserId(userId) {

    const service = this.getService();
    const url = `https://api.twitter.com/2/users/${userId}`

    const response = service.fetch(url, {
      method: "get",
      contentType: 'application/json'
    });
    const object = this.getAsObject(response)
    return object
  }



  /**
   * ツイートを削除する
   * 
   * @param {string} id - id
   * @return {object} data - data
   */
  destroy(id) {

    const service = this.getService();
    const url = `https://api.twitter.com/2/tweets/${id}`;
    const payload = {}

    const params = this._deleteParams(payload)
    const response = service.fetch(url, params);
    const object = this.getAsObject(response)
    return object
  }
  /**
   * リツイートを解除する
   * https://developer.twitter.com/en/docs/twitter-api/tweets/retweets/api-reference/post-users-id-retweets
   * 
   * @param {string} id - id
   * @return {object} data - data
   */
  unretweet(tweetId,accountName = this.accountName) {

    const service = this.getService();
    const userdata = this.getUserInfomationFromScreenName(accountName)
    const id = userdata.data.id

    const url = `https://api.twitter.com/2/users/${id}/retweets/${tweetId}`;
    const payload = {}
    const params = this._deleteParams(payload)
    const response = service.fetch(url, params);
    const object = this.getAsObject(response)
    return object
  }
  /**
   * リストからユーザーを削除する。
   * 
   * @param {string} - listId リストのID
   * @param {array} - userIdList ユーザーIdの配列
   * @return {object} - userIdList リスト
   */
  listsMembersDestroy(listId, userIdList) {
    const service = this.getService();
    const url = "https://api.twitter.com/1.1/lists/members/destroy_all.json"
    const payload = {
      "list_id": listId,
      "user_id": userIdList.join(",")
    }
    const params = this._postParams(payload)
    const response = service.fetch(url, params);

    const object = this.getAsObject(response)
    return object
  }

  /**
   * ポストする際のパラメータを取得する
   * 
   * @param {string} status - 
   * @return {object} postParams - 
   */
  _postParams(payload,contentType = 'application/json') {
    const postParams = {
      method: 'post',
      contentType: contentType,
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }
    return postParams
  }
  /**
   * ポストする際のパラメータを取得する
   * 
   * @param {string} status - 
   * @return {object} postParams - 
   */
  _postMediaParams(payload) {
    const postParams = {
      method: 'post',
      payload: payload,
      muteHttpExceptions: true
    }
    return postParams
  }




  /**
   * deleteする際のパラメータを取得する
   * 
   * @param {string} status - 
   * @return {object} postParams - 
   */
  _deleteParams(payload) {
    const postParams = {
      method: 'delete',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }
    return postParams
  }






  /**
   * UrlFetchApp を利用して取得した値をオブジェクト化して返す関数
   * @param {object} HTTPresponse
   * @return{object}
   */
  getAsObject(response) {
    const json = response.getContentText();
    const object = JSON.parse(json);
    return object;
  }

  /**
   * 各種プロパティをセットする静的メソッド
   * @params{string} - apiKey
   * @params{string} - apiSecret
   * @params{string} - accountName
   */
  static setProScriptProperties(apiKey, apiSecret, accountName) {
    PropertiesService.getScriptProperties().setProperty('TW_API_KEY', apiKey);
    PropertiesService.getScriptProperties().setProperty('TW_API_SECRET', apiSecret);
    PropertiesService.getScriptProperties().setProperty('TW_ACCOUNT_NAME', accountName);
  }
  /**
   * twitterから取得した時刻を変換する静的メソッド
   * @params{string} - 
   * @return{string} - 
   */
  static twitterdate(td) {
    //変換前「Tue Dec 16 23:48:56 +0000 2008」
    //変換後「2008年12月17日 8:48:56」
    re = /^(.+) (.+) (..) (..):(..):(..) (.+) (.+)$/;
    pat = "$2 $3, $8 $4:$5:$6 UTC+0000";
    rep = Utilities.formatDate(new Date(td.replace(re, pat)), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

    return rep.toLocaleString();
  }

}

