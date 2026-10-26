import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/auth-provider';
import { toApiError } from '@/api/errors';
import { getDashboardMonth } from '@/api/dashboard-api';
import { currentDashboardPeriod } from '@/features/dashboard/dashboard-period';
import { dashboardKeys } from '@/features/dashboard/use-dashboard-month';
import { getCurrentUser } from '@/features/profile/profile-api';
import { currentUserKeys } from '@/features/profile/profile-keys';
import { usePrivacy } from '@/privacy/privacy-provider';
import { homeWidgetBridge } from './home-widget-bridge';
import { toHomeWidgetSnapshot } from './home-widget-snapshot';

function SyncAndroidWidget({ children }: PropsWithChildren) {
  const { state } = useAuth();
  const { hidden, ready } = usePrivacy();
  const client = useQueryClient();
  const [period, setPeriod] = useState(currentDashboardPeriod);
  const lastSnapshot = useRef('');
  const authenticated = state.status === 'authenticated';
  const owner = useQuery({
    queryKey: currentUserKeys.current(),
    queryFn: getCurrentUser,
    enabled: authenticated,
    retry: false,
    staleTime: 5 * 60_000,
  });
  const ownerId = owner.data?.id ? String(owner.data.id) : '';
  const dashboard = useQuery({
    queryKey: dashboardKeys.month(period),
    queryFn: ({ signal }) => getDashboardMonth(period.year, period.month, signal),
    enabled: authenticated && ownerId.length > 0,
    retry: false,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (state.status !== 'unauthenticated') return;
    lastSnapshot.current = '';
    homeWidgetBridge.clear();
  }, [state.status]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    homeWidgetBridge.setAppHidden(hidden);
  }, [ready, authenticated, hidden]);

  useEffect(() => {
    if (!authenticated || !ownerId || !dashboard.isSuccess || !dashboard.dataUpdatedAt) return;
    const key = `${ownerId}:${period.year}-${period.month}:${dashboard.dataUpdatedAt}`;
    if (lastSnapshot.current === key) return;
    lastSnapshot.current = key;
    homeWidgetBridge.setSnapshot(
      toHomeWidgetSnapshot(ownerId, dashboard.data, period, dashboard.dataUpdatedAt),
    );
  }, [authenticated, ownerId, dashboard.isSuccess, dashboard.data, dashboard.dataUpdatedAt, period]);

  useEffect(() => {
    if (!authenticated) return;
    const failure = owner.error ?? dashboard.error;
    if (!failure) return;
    if (toApiError(failure).status === 401) {
      lastSnapshot.current = '';
      homeWidgetBridge.clear();
    } else {
      homeWidgetBridge.markOffline();
    }
  }, [authenticated, owner.error, dashboard.error]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (value) => {
      if (value !== 'active' || !authenticated) return;
      setPeriod(currentDashboardPeriod());
      void client.invalidateQueries({ queryKey: dashboardKeys.all });
    });
    return () => subscription.remove();
  }, [authenticated, client]);

  return children;
}

export function HomeWidgetProvider({ children }: PropsWithChildren) {
  if (!homeWidgetBridge.available) return children;
  return <SyncAndroidWidget>{children}</SyncAndroidWidget>;
}
