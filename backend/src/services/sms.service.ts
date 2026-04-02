/**
 * @module sms.service
 * @description 알리고(Aligo) SMS API를 이용한 문자 발송 서비스.
 *
 * 동작 흐름:
 *   1. 환경변수(ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER)가 모두 설정된 경우에만 활성화됨.
 *   2. sendSms() 호출 시 수신자 번호를 정규화(하이픈 제거)한 뒤 알리고 REST API로 POST 요청.
 *   3. 발송 실패(API 오류, 네트워크 오류) 시 콘솔에 로그를 남기고 예외를 throw하지 않음.
 *      — SMS 발송은 부가 기능이므로 핵심 기능(채팅, 세션 등)을 중단시키면 안 되기 때문.
 *   4. 개발 환경(NODE_ENV !== 'production')에서는 테스트 모드(testmode_yn=Y)로 발송하여
 *      실제 문자가 발송되지 않도록 안전하게 처리함.
 */
import { env } from '../config/env.js';

/** 알리고 API 응답 형식 */
interface AligoResponse {
  /** 결과 코드 — 1이면 성공, 그 외는 실패 */
  result_code: number;
  /** 결과 메시지 (성공/실패 사유) */
  message: string;
  /** 발송된 메시지 고유 ID (성공 시에만 존재) */
  msg_id?: string;
  /** 발송 성공 건수 */
  success_cnt?: number;
  /** 발송 실패 건수 */
  error_cnt?: number;
}

class SmsService {
  /** 알리고 SMS 발송 REST API 엔드포인트 */
  private readonly apiUrl = 'https://apis.aligo.in/send/';

  /**
   * 알리고 SMS 설정 여부 확인.
   * ALIGO_API_KEY, ALIGO_USER_ID(플레이스홀더 제외), ALIGO_SENDER가 모두 설정된 경우에만 true 반환.
   * false이면 sendSms() 호출 시 즉시 skip된다.
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
   * SMS 발송.
   * 발송 실패 시 에러를 throw하지 않고 콘솔에만 로그를 남긴다.
   * (SMS는 부가 알림 기능이므로 실패해도 서비스 전체에 영향을 주어선 안 됨)
   *
   * @param receiver - 수신 전화번호 (예: '01012345678' 또는 '010-1234-5678' — 하이픈 자동 제거됨)
   * @param message  - 발송할 문자 내용 (90바이트 이하 권장, 초과 시 LMS로 자동 전환됨)
   */
  async sendSms(receiver: string, message: string): Promise<void> {
    // 알리고 환경변수가 미설정이면 SMS 발송을 건너뜀
    if (!this.isAvailable()) {
      console.warn('[SMS] 알리고 설정이 없습니다 — SMS 발송 스킵');
      return;
    }

    // 하이픈 제거 후 정규화 (알리고 API는 숫자만 허용)
    const normalizedReceiver = receiver.replace(/-/g, '');

    // 알리고 API 요청 파라미터 구성
    const params = new URLSearchParams({
      key: env.ALIGO_API_KEY!,
      user_id: env.ALIGO_USER_ID!,
      sender: env.ALIGO_SENDER!,
      receiver: normalizedReceiver,
      msg: message,
      // 개발 모드에서는 테스트 모드로 발송 — 실제 문자가 발송되지 않음
      testmode_yn: env.NODE_ENV === 'production' ? 'N' : 'Y',
    });

    try {
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const json = (await res.json()) as AligoResponse;

      // result_code가 1이 아니면 알리고 측에서 발송 거부한 것
      if (json.result_code !== 1) {
        console.error(`[SMS] 발송 실패: ${json.message} (코드: ${json.result_code})`);
        return;
      }

      console.info(`[SMS] 발송 완료 → ${normalizedReceiver}, msg_id=${json.msg_id}`);
    } catch (err) {
      // 네트워크 오류, 타임아웃 등 — 핵심 기능을 막지 않기 위해 로그만 출력하고 계속 진행
      console.error('[SMS] 발송 중 오류 발생:', err);
    }
  }
}

/** 앱 전역에서 공유하는 싱글턴 인스턴스 */
export const smsService = new SmsService();
