/**
 * 클라이언트 사이드 이미지 정방형 크롭 및 WebP 압축 유틸리티.
 *
 * 프로필 사진을 1:1 정방형으로 중앙 크롭하고, 고화질 512x512 해상도의 WebP 포맷으로
 * 압축하여 네트워크 대역폭 및 스토리지 용량을 최적화합니다.
 */

/**
 * 이미지 파일을 512x512 1:1 정방형 WebP Blob으로 변환합니다.
 *
 * @param {File} file - 사용자가 선택한 이미지 파일
 * @param {object} [options]
 * @param {number} [options.targetSize=512] - 출력 가로/세로 픽셀
 * @param {number} [options.quality=0.88] - WebP 압축 품질 (0~1)
 * @returns {Promise<{ blob: Blob, dataUrl: string, width: number, height: number }>}
 */
export async function cropAndCompressAvatar(file, { targetSize = 512, quality = 0.88 } = {}) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('유효한 이미지 파일이 아닙니다.');
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;

        if (!naturalWidth || !naturalHeight) {
          throw new Error('이미지 크기를 계산할 수 없습니다.');
        }

        // 1:1 정방형 중앙 크롭 영역 계산
        const cropSize = Math.min(naturalWidth, naturalHeight);
        const startX = (naturalWidth - cropSize) / 2;
        const startY = (naturalHeight - cropSize) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D Context를 생성할 수 없습니다.');
        }

        // 부드러운 이미지 리샘플링
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 중앙 크롭 후 512x512 캔버스에 그리기
        ctx.drawImage(img, startX, startY, cropSize, cropSize, 0, 0, targetSize, targetSize);

        // WebP Blob 추출 (브라우저 지원 fallback 처리)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const dataUrl = canvas.toDataURL('image/webp', quality);
              resolve({ blob, dataUrl, width: targetSize, height: targetSize });
            } else {
              // WebP 미지원 시 JPEG fallback
              canvas.toBlob(
                (fallbackBlob) => {
                  if (fallbackBlob) {
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve({ blob: fallbackBlob, dataUrl, width: targetSize, height: targetSize });
                  } else {
                    reject(new Error('이미지 Blob 변환에 실패했습니다.'));
                  }
                },
                'image/jpeg',
                quality
              );
            }
          },
          'image/webp',
          quality
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 불러오지 못했습니다. 파일이 손상되었을 수 있습니다.'));
    };

    img.src = objectUrl;
  });
}
