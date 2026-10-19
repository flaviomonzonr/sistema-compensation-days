import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../storage';

export type NavigationTab = 'dashboard' | 'empleados' | 'compensaciones' | 'feriados' | 'permisos' | 'licencias';

interface AppContextType {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  selectedEmployeeIdForCompensations: string | null;
  setSelectedEmployeeIdForCompensations: (id: string | null) => void;
  selectedCompensationIdsForPermissionSheet: string[] | null;
  setSelectedCompensationIdsForPermissionSheet: (ids: string[] | null) => void;
  selectedDateForBulkPermissions: string | null;
  setSelectedDateForBulkPermissions: (date: string | null) => void;
  openEmployeeCompensations: (employeeId: string) => void;
  openPermissionSheetForEmployee: (employeeId: string, compensationIds?: string[]) => void;
  openBulkPermissionSheetForDate: (date: string) => void;
  refreshKey: number;
  triggerRefresh: () => void;
  resetDatabaseToDefaults: () => void;
  clearAllData: (keepHolidays?: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [selectedEmployeeIdForCompensations, setSelectedEmployeeIdForCompensations] =
    useState<string | null>(null);
  const [selectedCompensationIdsForPermissionSheet, setSelectedCompensationIdsForPermissionSheet] =
    useState<string[] | null>(null);
  const [selectedDateForBulkPermissions, setSelectedDateForBulkPermissions] =
    useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setRefreshKey((prev) => prev + 1);
    });
    return () => unsubscribe();
  }, []);

  const openEmployeeCompensations = (employeeId: string) => {
    setSelectedEmployeeIdForCompensations(employeeId);
    setCurrentTab('compensaciones');
  };

  const openPermissionSheetForEmployee = (employeeId: string, compensationIds?: string[]) => {
    setSelectedEmployeeIdForCompensations(employeeId);
    setSelectedCompensationIdsForPermissionSheet(compensationIds && compensationIds.length > 0 ? compensationIds : null);
    setCurrentTab('permisos');
  };

  const openBulkPermissionSheetForDate = (date: string) => {
    setSelectedDateForBulkPermissions(date);
    setCurrentTab('permisos');
  };

  const resetDatabaseToDefaults = () => {
    db.resetToDefaults();
  };

  const clearAllData = async (keepHolidays = true) => {
    await db.clearAllData(keepHolidays);
  };

  return (
    <AppContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        selectedEmployeeIdForCompensations,
        setSelectedEmployeeIdForCompensations,
        selectedCompensationIdsForPermissionSheet,
        setSelectedCompensationIdsForPermissionSheet,
        selectedDateForBulkPermissions,
        setSelectedDateForBulkPermissions,
        openEmployeeCompensations,
        openPermissionSheetForEmployee,
        openBulkPermissionSheetForDate,
        refreshKey,
        triggerRefresh,
        resetDatabaseToDefaults,
        clearAllData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe usarse dentro de AppProvider');
  }
  return context;
};
