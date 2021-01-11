const hanyangApiRun = require('./hanyangapi_sdk');
let receivedAuthCodeExample = '8143ee33fe0a3d3dd85d08935d6314';
//이 Authorization Code는 예시입니다. 실제로 구동되지 않습니다.

hanyangApiRun(receivedAuthCodeExample)
.then(hyuResponse => {
    console.log(hyuResponse)
})

/*
[참고] hyuResponse 결과 예제 (scope 10, "로그인사용자 정보조회" 기능기준)
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