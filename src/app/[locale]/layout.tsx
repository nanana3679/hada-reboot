import Navigation from '@/components/Navigation/Navigation';
import { SnackbarProvider } from '@/components/Snackbar/SnackbarProvider';

import I18nProvider from '@/providers/I18nProvider';
import { StoreProvider } from '@/providers/StoreProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import ErrorBoundaryWrapper from '@/providers/ErrorBoundaryWrapper';

import { getAuth } from '@/auth';
import UserOptionInitializer from '@/components/UserOptionInitializer';
import { cookies } from 'next/headers';

import styles from './layout.module.scss';

const NavigationLayout = async ({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) => {
  const { auth } = await getAuth();
  const session = await auth();
  const isLoggedIn = !!session;
  const { locale } = await params;

  const hasOptionsCookie = (await cookies()).has('has-options');
  const needsOptionInit = isLoggedIn && !hasOptionsCookie;

  return (
    <ErrorBoundaryWrapper>
      <StoreProvider>
        <QueryProvider>
          <div className={styles['navigation-layout']}>
            <I18nProvider>
              <SnackbarProvider>
                <Navigation isLoggedIn={isLoggedIn} />
                {needsOptionInit && <UserOptionInitializer locale={locale} />}
                {children}
              </SnackbarProvider>
            </I18nProvider>
          </div>
        </QueryProvider>
      </StoreProvider>
    </ErrorBoundaryWrapper>
  );
};

export default NavigationLayout;
