import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WxSession {
  openid: string;
  unionid?: string;
  sessionKey: string;
}

export interface WxOAuthUser {
  openid: string;
  unionid?: string;
  nickname?: string;
  headImgUrl?: string;
}

/**
 * 微信开放能力客户端。
 * 真实环境调用微信开放平台 HTTP API；测试中通过覆盖本类注入 mock。
 */
@Injectable()
export class WxClient {
  private readonly logger = new Logger(WxClient.name);

  constructor(private readonly config: ConfigService) {}

  /** 小程序：code -> session */
  async jscode2session(code: string): Promise<WxSession> {
    const appid = this.config.get<string>('WX_APPID');
    const secret = this.config.get<string>('WX_SECRET');
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
    const res = await fetch(url);
    const data = (await res.json()) as { openid?: string; unionid?: string; session_key?: string; errcode?: number; errmsg?: string };
    if (!data.openid) {
      this.logger.error(`jscode2session failed: ${data.errmsg ?? 'unknown'}`);
      throw new Error(`WeChat jscode2session failed: ${data.errmsg ?? 'no openid'}`);
    }
    return { openid: data.openid, unionid: data.unionid, sessionKey: data.session_key ?? '' };
  }

  /** Web 扫码：用 code 换 access_token 与用户信息 */
  async getOAuthUserByCode(code: string): Promise<WxOAuthUser> {
    const appid = this.config.get<string>('WX_WEB_APPID');
    const secret = this.config.get<string>('WX_WEB_SECRET');
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appid}&secret=${secret}&code=${code}&grant_type=authorization_code`;
    const tRes = await fetch(tokenUrl);
    const tData = (await tRes.json()) as { access_token?: string; openid?: string; errcode?: number; errmsg?: string };
    if (!tData.access_token || !tData.openid) {
      throw new Error(`WeChat oauth access_token failed: ${tData.errmsg ?? 'unknown'}`);
    }
    const userUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${tData.access_token}&openid=${tData.openid}`;
    const uRes = await fetch(userUrl);
    const uData = (await uRes.json()) as { openid?: string; unionid?: string; nickname?: string; headimgurl?: string };
    return {
      openid: uData.openid ?? tData.openid,
      unionid: uData.unionid,
      nickname: uData.nickname,
      headImgUrl: uData.headimgurl,
    };
  }

  /** 生成扫码二维码 URL（真实环境使用开放平台 wx.open.qrcode 或第三方）。本期返回占位 URL。 */
  async createQrCodeUrl(ticket: string): Promise<string> {
    return `https://open.weixin.qq.com/connect/oauth2/authorize?ticket=${encodeURIComponent(ticket)}#wechat_redirect`;
  }
}
