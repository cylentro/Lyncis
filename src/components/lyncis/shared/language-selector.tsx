'use client';

import * as React from 'react';
import { Languages, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/components/providers/language-provider';
import { Locale } from '@/i18n/get-dictionary';
import { cn } from '@/lib/utils';

export function LanguageSelector() {
  const { locale, setLocale } = useLanguage();

  const languages: { label: string; value: Locale }[] = [
    { label: 'Bahasa Indonesia', value: 'id' },
    { label: 'English', value: 'en' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 text-muted-foreground hover:text-foreground active:scale-90 transition-all"
        >
          <Languages className="h-4 w-4" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.value}
            onClick={() => setLocale(lang.value)}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              locale === lang.value && "font-medium text-primary bg-primary/5"
            )}
          >
            {lang.label}
            {locale === lang.value && <Check className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
