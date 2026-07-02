// ============================================================
// 최소 연결 테스트 (통신 확인용)
// ============================================================

function testConnection() {
  console.log("✅ testConnection function is working!");
  return "✅ Connection successful! (test)";
}

function renderGraphic(jsonData) {
  console.log("✅ renderGraphic called with:", jsonData);
  
  // 간단한 테스트 HTML 반환
  return '<div style="padding:20px;background:#e8f5e9;border-radius:8px;border:2px solid #4caf50;text-align:center;">' +
         '<h3>✅ 연결 성공!</h3>' +
         '<p>renderGraphic() 함수가 정상적으로 호출되었습니다.</p>' +
         '<p style="font-size:12px;color:#666;">전달된 데이터: ' + (jsonData || '(없음)') + '</p>' +
         '</div>';
}

// ===== 전역 노출 (HTML에서 호출 가능) =====
window.testConnection = testConnection;
window.renderGraphic = renderGraphic;

console.log("✅ test.js loaded - Connection test ready!");
