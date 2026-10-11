import { lazy, Suspense } from 'react';
import LoadingSequence from '../components/LoadingSequence';
import { useLanguage } from '../store/languageStore';

// 3D 씬(three.js)은 서재 페이지 진입 시에만 로드
const LibraryScene = lazy(() => import('../features/room/LibraryScene'));

export default function MyLibrary() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<LoadingSequence size={120} label={t('library.preparing', '서재를 준비하고 있어요... 🐾')} padding={40} />}>
      <LibraryScene />
    </Suspense>
  );
}
