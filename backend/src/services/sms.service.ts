// 알리고 SMS 발송 서비스
import { env } from '../config/env.js';

/** 알리고 API 응답 형식 */
interface AligoResponse {
  result_code: number;
  message: string;
  msg_id?: string;
  success_cnt?: number;
  error_cnt?: number;
}

class SmsService {
  private readonly apiUrl = 'https://apis.aligo.in/send/';

  /**
   * 알리고 SMS 설정 여부 확인
   * API key와 user_id 모두 설정된 경우에만 true 반환
   */
  isAvailable(): boolean {
    return (
      !!env.ALIGO_API_KEY &&
      !!env.ALIGO_USER_ID &&
      env.ALIGO_USER_ID !== 'placeholder' &&
      !!env.ALIGO_SENDER
    );
  }

  /**
   * SMS 발송 — 실패 시 로그만 남기고 throw하지 않음
   * @param receiver - 수신 전화번호 (예: 01012345678)
   * @param message - 발송할 문자 내용 (90바이트 이하 권장)
   */
  async sendSms(receiver: string, message: string): Promise<void> {
    if (!this.isAvailable()) {
      console.warn('[SMS] 알리고 설정이 없습니다 — SMS 발송 스킵');
      return;
    }

    // 하이픈 제거 후 정규화
    const normalizedReceiver = receiver.replace(/-/g, '');

    const params = new URLSearchParams({
      key: env.ALIGO_API_KEY!,
      user_id: env.ALIGO_USER_ID!,
      sender: env.ALIGO_SENDER!,
      receiver: normalizedReceiver,
      msg: message,
      // 개발 모드에서는 테스트 모드로 발송
      testmode_yn: env.NODE_ENV === 'production' ? 'N' : 'Y',
    });

    try {
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const json = (await res.json()) as AligoResponse;

      if (json.result_code !== 1) {
        console.error(`[SMS] 발송 실패: ${json.message} (코드: ${json.result_code})`);
        return;
      }

      console.info(`[SMS] 발송 완료 → ${normalizedReceiver}, msg_id=${json.msg_id}`);
    } catch (err) {
      // 네트워크 오류 등 — 핵심 기능을 막지 않기 위해 로그만 출력
      console.error('[SMS] 발송 중 오류 발생:', err);
    }
  }
}

// 싱글턴 인스턴스 export
export const smsService = new SmsService();
