'use client';
// 락 요청 다이얼로그 — 선택적 메시지 입력 후 전송

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

interface LockRequestDialogProps {
  open: boolean;
  lockerName: string;
  onClose: () => void;
  /** 메시지와 함께 요청 전송 */
  onSubmit: (message: string) => Promise<void>;
}

export function LockRequestDialog({
  open,
  lockerName,
  onClose,
  onSubmit,
}: LockRequestDialogProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await onSubmit(message.trim());
      setMessage('');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" style={{ backgroundColor: '#fff', borderColor: '#E8E5DE' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: '#1A1A1A' }}>
            <MessageSquare size={18} style={{ color: '#2D7D7B' }} />
            작업 권한 요청
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <p className="text-sm" style={{ color: '#6B6B7B' }}>
            <span style={{ color: '#1A1A1A', fontWeight: 500 }}>{lockerName}</span>
            님에게 작업 권한을 요청합니다. 메시지를 남기면 상대방에게 전달됩니다.
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="메시지를 입력하세요 (선택 사항)"
            rows={3}
            className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#2D7D7B] placeholder:text-[#6B6B7B]"
            style={{ borderColor: '#E8E5DE', color: '#1A1A1A', backgroundColor: '#F9F9F4' }}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            style={{ borderColor: '#E8E5DE', color: '#6B6B7B' }}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            style={{ backgroundColor: '#2D7D7B', color: '#fff' }}
          >
            {isLoading ? '전송 중...' : '요청 전송'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
