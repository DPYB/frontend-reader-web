/**
 * 클라이언트 사이드 이미지 최적화 및 WebP 압축 유틸리티.
 *
 * 1. 프로필 아바타: 1:1 정방형 중앙 크롭 & 512x512 WebP 변환
 * 2. 문장 수집 사진: 원본 가로세로 비율 유지 & 최대 1600px 고화질 WebP 변환
 */

/**
 * 이미지 파일을 512x512 1:1 정방형 WebP Blob으로 변환합니다.
 *
 * @param {File} file - 사용자가 선택한 이미지 파일
 * @param {object} [options]
 * @param {number} [options.targetSize=512] - 출력 가로/세로 픽셀
 * @param {number} [options.quality=0.88] - WebP 압축 품질 (0~1)
 * @returns {Promise<{ blob: Blob, previewUrl: string, dataUrl: string, width: number, height: number }>}
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
              const previewUrl = URL.createObjectURL(blob);
              const dataUrl = canvas.toDataURL('image/webp', quality);
              resolve({ blob, previewUrl, dataUrl, width: targetSize, height: targetSize });
            } else {
              // WebP 미지원 시 JPEG fallback
              canvas.toBlob(
                (fallbackBlob) => {
                  if (fallbackBlob) {
                    const previewUrl = URL.createObjectURL(fallbackBlob);
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve({ blob: fallbackBlob, previewUrl, dataUrl, width: targetSize, height: targetSize });
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

/**
 * 문장 수집용 책 사진을 비율을 유지하며 고화질 WebP Blob으로 최적화 압축합니다.
 * OCR 텍스트 가독성을 보존하기 위해 긴 축 기준 최대 1600px로 제한합니다.
 *
 * @param {File|Blob} file - 원본 이미지 파일
 * @param {object} [options]
 * @param {number} [options.maxDimension=1600] - 최대 가로 또는 세로 해상도 (픽셀)
 * @param {number} [options.quality=0.85] - WebP 압축 품질 (0~1)
 * @returns {Promise<{ blob: Blob, previewUrl: string, dataUrl: string, width: number, height: number }>}
 */
export async function compressQuoteImage(file, { maxDimension = 1600, quality = 0.85 } = {}) {
  if (!file) {
    throw new Error('이미지 파일이 전달되지 않았습니다.');
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

        // 가로세로 비율 유지 리사이즈 계산
        let targetWidth = naturalWidth;
        let targetHeight = naturalHeight;

        const maxSide = Math.max(naturalWidth, naturalHeight);
        if (maxSide > maxDimension) {
          const scale = maxDimension / maxSide;
          targetWidth = Math.round(naturalWidth * scale);
          targetHeight = Math.round(naturalHeight * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D Context를 생성할 수 없습니다.');
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const previewUrl = URL.createObjectURL(blob);
              const dataUrl = canvas.toDataURL('image/webp', quality);
              resolve({ blob, previewUrl, dataUrl, width: targetWidth, height: targetHeight });
            } else {
              canvas.toBlob(
                (fallbackBlob) => {
                  if (fallbackBlob) {
                    const previewUrl = URL.createObjectURL(fallbackBlob);
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve({ blob: fallbackBlob, previewUrl, dataUrl, width: targetWidth, height: targetHeight });
                  } else {
                    reject(new Error('문장 이미지 Blob 변환에 실패했습니다.'));
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
      reject(new Error('문장 이미지를 불러오지 못했습니다. 파일이 손상되었을 수 있습니다.'));
    };

    img.src = objectUrl;
  });
}
