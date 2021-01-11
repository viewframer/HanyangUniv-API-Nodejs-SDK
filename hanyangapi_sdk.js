/*==============================================================
한양대학교 API - Node.js SDK (비공식)
Hanyang University API - Node.js SDK (Unofficial)
version 1.0.0
================================================================
2021.01.11.
한양대학교 사회과학대학 미디어커뮤니케이션학과 성시호 작성
github.com/viewframer
================================================================
* 의존성 패키지가 존재합니다.
* package.json, package-lock.json을 확인하신 후
  npm install 하시기 바랍니다.
================================================================
* 개발자센터 [마이앱-앱관리] 표시정보를 아래 [등록정보]에 입력하셔야 정상작동합니다.
  사용승인절차 등 API 관련 정보는 '한양대학교API 개발자센터'를 참조해 주세요.
  https://api.hanyang.ac.kr/
================================================================*/

//[등록정보] 본인이 개발자센터에 등록한 API client정보
const hyu_api_id = '여기에_발급받은_클라이언트_아이디를_입력하세요';
const hyu_api_secret = '여기에_발급받은_클라이언트_시크릿을_입력하세요';
const hyu_redirect_uri = '여기에_등록한_리다이렉트_주소를_입력하세요';

//[모듈] HTTP요청
const axios = require('axios');
const querystring = require('querystring');

//[모듈] 암호화
const crypto = require('crypto');
const pkcs7 = require('pkcs7');

//[초기화] 암호화 관련
const swapKey = String(Date.now());
const url_Enc = 'https://api.hanyang.ac.kr/oauth/get_param_enc_key';
let data = {'client_id': hyu_api_id, 'swap_key': swapKey};

//[초기화] 최종요청경로
const url_Req = 'https://api.hanyang.ac.kr/rs/user/loginInfo.json';

//[초기화] 0-1. 암호화 관련함수 - PKCS7 Padding
const pkcs7Pad = (params) => {
    const buffer = Buffer.from(params, "utf8");
    const bytes = new Uint8Array(buffer.length);
    let i = buffer.length;
    while (i--) {
        bytes[i] = buffer[i];
    }
    return Buffer.from(pkcs7.pad(bytes));
};

//[초기화] 0-2. 암호화 관련함수 - AES-256-CBC Encryption
const encrypt = (utf8Text, privateKey, ivKey) => {
    const cipher = crypto.createCipheriv("AES-256-CBC", privateKey, ivKey);
    cipher.setAutoPadding(false);
    let encrypted = cipher.update(pkcs7Pad(utf8Text), 'utf-8', "hex");
    encrypted += cipher.final('hex');
    return encrypted;
};

//[초기화] 1-1. 액세스토큰 요청함수
function AccessTokenCall(hyuAuthCode){
    return new Promise((resolve, reject) => {
        let url_tokenGet = `https://api.hanyang.ac.kr/oauth/token?client_id=${hyu_api_id}&client_secret=${hyu_api_secret}&code=${hyuAuthCode}&scope=10&redirect_uri=${hyu_redirect_uri}&grant_type=authorization_code`;

        axios.get(url_tokenGet).then((response) => {
            resolve(response.data)
            /*
            [참고] : response.data 예시
            [성공]
            {
                scope: '10',
                expires_in: 43200,
                token_type: 'bearer',
                refresh_token: '3fa7dbf6fc91d4a7a9ba8f36ddbac068',
                access_token: '38928edd105dcee4778efc4ab36a5f6e'
            },
            [에러]
            {
                error: '***',
                error_description: '***'
            }
            */
        })
    })
}

//[초기화] 1-2. 암호화 iv, privateKey 요청함수
function EncInfoCall(){
    return new Promise((resolve, reject) => {
        axios.post(url_Enc, querystring.stringify(data)).then((response) => {
            /*
            [참고] : response.data.body 예시
            {
                swapKey: '***',
                iv: '***',
                key: '***'
            }
            */
            let reqParamStringToEncrypt = '' // API에서 사용자인증시에는 공란으로 처리한 뒤 암호화한다. 
            const encResult = encrypt(reqParamStringToEncrypt, response.data.body.key, response.data.body.iv)
            resolve(encResult)
        });
    })
}

//[함수] 2-1. 액세스토큰, 암호화정보를 서버에 요청해 받음
function Step1InfoRequest(authCodeInput){
    return new Promise((resolve,reject) => {
        let accessTokenAndEncResults = Promise.all([
            AccessTokenCall(authCodeInput),
            EncInfoCall()   
        ])
        resolve(accessTokenAndEncResults)
    })
}
/*
[참고] : accessTokenAndEncResults 예제 
[
    {
        scope: '10',
        expires_in: 43200,
        token_type: 'bearer',
        refresh_token: '3fa7dbf6fc91d4a7a9ba8f36ddbac068',
        access_token: '38928edd105dcee4778efc4ab36a5f6e'
    },
    '696da90244bf5877fc9f5d304ee64324'
]
*/

//[함수] 2-2. 유저데이터 요청
function Step2UserDataRequest(Step1Results){
    return new Promise((resolve, reject) => {
        let acTokenResult = Step1Results[0]
        let encResult = Step1Results[1]
        let myheaders = {
            'client_id': hyu_api_id,
            'access_token': acTokenResult.access_token,
            'swap_key': swapKey
        }
        axios.get(url_Req,{params: {enc : encResult}, headers: myheaders}).then((response) => {
            resolve(response.data)
        });
    })
}
/*
[참고] hyuResponse 예제 (scope ID 10, "로그인사용자 정보조회" 기능기준)
{
    userNm: '김한양',
    jaejikYn: '1',
    loginId: 'myportalid', //한양인 포털ID
    userGb: '0110',
    sosokCd: 'H0001234',
    daehakNm: '사회과학대학',
    userGbNm: '재학생',
    gaeinNo: '2021054321', //학번
    uuid: '00654321',
    sosokId: 'FH04321',
    sosokNm: '서울 사회과학대학 미디어커뮤니케이션학과'
}
*/

// ================================================================ // 
//[함수] 3. Step1, Step2를 묶어서 Authorization Code만 입력하면 실행되도록 구성
function hanyangApiRun(enteredAuthCode){
    return new Promise((resolve, reject) => {
        Step1InfoRequest(enteredAuthCode)
        .then(firstinfo => Step2UserDataRequest(firstinfo))
        .then(secondinfo => {
            resolve(secondinfo.response.item)
        })        
    })
}
module.exports = hanyangApiRun;
// ================================================================ // 
/*
[활용예제코드]
- hanyangApiRun 함수를 불러올 js파일에 아래와 같이 작성해 보세요.
- 이 SDK에서는 runner.js파일에 동일한 내용이 작성되어 있습니다. */

/*
const hanyangApiRun = require('./promise-myapi');
let receivedAuthCodeExample = 'fe7322c2ec3c1a0c5926ee86f10f5'; //이 authCode는 예시입니다. 실제로 구동되지 않습니다.

hanyangApiRun(receivedAuthCodeExample)
.then(hyuResponse => {
    console.log(hyuResponse)
})
*/

