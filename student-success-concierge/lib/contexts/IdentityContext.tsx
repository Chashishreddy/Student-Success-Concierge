'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface Student {
  id: number;
  handle: string;
  cohortId: number | null;
  created_at: string;
}

interface IdentityContextType {
  student: Student | null;
  cohort: any | null;
  isLoading: boolean;
  setIdentity: (student: Student, cohort: any) => void;
  clearIdentity: () => void;
}

const IdentityContext = createContext<IdentityContextType | undefined>(undefined);

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [cohort, setCohort] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load identity from localStorage
    const stored = localStorage.getItem('student_identity');
    if (stored) {
      try {
        const { student: storedStudent, cohort: storedCohort } = JSON.parse(stored);
        setStudent(storedStudent);
        setCohort(storedCohort);
      } catch (error) {
        console.error('Failed to parse stored identity:', error);
      }
    }
    setIsLoading(false);
  }, []);

  const setIdentity = (newStudent: Student, newCohort: any) => {
    setStudent(newStudent);
    setCohort(newCohort);
    localStorage.setItem(
      'student_identity',
      JSON.stringify({ student: newStudent, cohort: newCohort })
    );
  };

  const clearIdentity = () => {
    setStudent(null);
    setCohort(null);
    localStorage.removeItem('student_identity');
  };

  return (
    <IdentityContext.Provider
      value={{ student, cohort, isLoading, setIdentity, clearIdentity }}
    >
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  const context = useContext(IdentityContext);
  if (context === undefined) {
    throw new Error('useIdentity must be used within an IdentityProvider');
  }
  return context;
}
