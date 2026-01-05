import { useState, useEffect, useCallback } from 'react';

interface HiddenAddress {
  localPart: string;
  domain: string;
  hiddenAt: string;
}

const STORAGE_KEY = 'flowmail_hidden_addresses';

function getStoredAddresses(): HiddenAddress[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveAddresses(addresses: HiddenAddress[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
}

export function useHiddenAddresses(domain: string) {
  const [hiddenAddresses, setHiddenAddresses] = useState<HiddenAddress[]>([]);

  // Load from localStorage
  useEffect(() => {
    const all = getStoredAddresses();
    const forDomain = all.filter(a => a.domain.toLowerCase() === domain.toLowerCase());
    setHiddenAddresses(forDomain);
  }, [domain]);

  // Hide an address (can be restored later)
  const hideAddress = useCallback((localPart: string) => {
    const all = getStoredAddresses();
    const exists = all.find(
      a => a.localPart.toLowerCase() === localPart.toLowerCase() && 
           a.domain.toLowerCase() === domain.toLowerCase()
    );
    
    if (!exists) {
      const newAddress: HiddenAddress = {
        localPart: localPart.toLowerCase(),
        domain: domain.toLowerCase(),
        hiddenAt: new Date().toISOString(),
      };
      const updated = [...all, newAddress];
      saveAddresses(updated);
      setHiddenAddresses(prev => [...prev, newAddress]);
    }
  }, [domain]);

  // Restore a hidden address
  const restoreAddress = useCallback((localPart: string) => {
    const all = getStoredAddresses();
    const filtered = all.filter(
      a => !(a.localPart.toLowerCase() === localPart.toLowerCase() && 
             a.domain.toLowerCase() === domain.toLowerCase())
    );
    saveAddresses(filtered);
    setHiddenAddresses(prev => 
      prev.filter(a => a.localPart.toLowerCase() !== localPart.toLowerCase())
    );
  }, [domain]);

  // Check if an address is hidden
  const isHidden = useCallback((localPart: string) => {
    return hiddenAddresses.some(
      a => a.localPart.toLowerCase() === localPart.toLowerCase()
    );
  }, [hiddenAddresses]);

  return {
    hiddenAddresses,
    hideAddress,
    restoreAddress,
    isHidden,
  };
}
