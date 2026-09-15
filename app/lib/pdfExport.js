import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * 지정된 HTML 요소를 캡처하여 사서 맞춤형 PDF 파일로 다운로드합니다.
 *
 * @param {object} params
 * @param {HTMLElement} params.element - 캡처할 DOM 요소
 * @param {string} params.librarianName - 현재 사서의 닉네임 (예: '블루', '슈빌', '빌' 등)
 * @param {string} [params.title='월간_독서_리포트'] - 문서 성격
 * @returns {Promise<boolean>}
 */
export async function downloadReportAsPdf({ element, librarianName = '사서', title = '월간_독서_리포트' }) {
  if (!element) return false;

  try {
    // 1. 캡처 전용 스타일 보정 및 html2canvas 렌더링
    const canvas = await html2canvas(element, {
      scale: 2, // 고해상도 인쇄 품질
      useCORS: true, // 외부 이미지 CORS 허용 (도서 표지 등)
      allowTaint: false,
      logging: false,
      backgroundColor: '#18191c', // 다크/서재 톤 안정적 기본 배경
      windowWidth: element.scrollWidth,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // 2. A4 규격 기준 (210mm x 297mm) 계산
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // 첫 페이지 추가
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    // 콘텐츠가 A4 1장을 초과하면 멀티 페이지 자동 분할
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    // 3. 요구 명세 파일명 생성: "{사서이름}_사서의_월간_독서_리포트.pdf"
    const safeName = (librarianName || '사서').replace(/[\s/\\:*?"<>|]/g, '_');
    const fileName = `${safeName}_사서의_${title}.pdf`;

    pdf.save(fileName);
    return true;
  } catch (err) {
    console.error('[pdfExport] PDF 생성 실패:', err);
    throw err;
  }
}
