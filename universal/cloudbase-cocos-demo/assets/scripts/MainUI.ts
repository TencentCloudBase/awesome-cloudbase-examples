import {
    _decorator, Component, Node, Label, EditBox, Button, UITransform,
    Color, Vec3, Layers, Sprite, SpriteFrame, Texture2D, view, sys
} from 'cc';
import { cloudbaseService } from './services/CloudbaseService';
import { authService } from './services/AuthService';

const { ccclass } = _decorator;

const UI_2D = Layers.Enum.UI_2D;

// 设计尺寸
const DESIGN_WIDTH = 720;
const DESIGN_HEIGHT = 1280;

// 主题
const Theme = {
    bgPrimary: new Color(15, 23, 42, 255),
    bgSecondary: new Color(30, 41, 59, 255),
    bgTertiary: new Color(51, 65, 85, 255),
    primary: new Color(59, 130, 246, 255),
    danger: new Color(239, 68, 68, 255),
    textPrimary: new Color(248, 250, 252, 255),
    textSecondary: new Color(148, 163, 184, 255),
    textMuted: new Color(100, 116, 139, 255),
};

type LoginMode = 'password' | 'phone' | 'email' | 'anonymous';

@ccclass('MainUI')
export class MainUI extends Component {
    private configPanel: Node | null = null;
    private loginPanel: Node | null = null;
    private userPanel: Node | null = null;
    private testPanel: Node | null = null;

    private envIdInput: EditBox | null = null;
    private accessKeyInput: EditBox | null = null;
    private usernameInput: EditBox | null = null;
    private passwordInput: EditBox | null = null;
    private phoneInput: EditBox | null = null;
    private emailInput: EditBox | null = null;
    private otpInput: EditBox | null = null;
    private functionNameInput: EditBox | null = null;
    private functionDataInput: EditBox | null = null;
    private modelNameInput: EditBox | null = null;
    private modelMethodInput: EditBox | null = null;
    private modelParamsInput: EditBox | null = null;

    private statusLabel: Label | null = null;
    private userInfoLabel: Label | null = null;
    private resultLabel: Label | null = null;

    private loginMode: LoginMode = 'password';
    private verifyOtpFn: ((code: string) => Promise<any>) | null = null;
    private otpSent = false;

    private _whiteSpriteFrame: SpriteFrame | null = null;

    start() {
        this.createWhiteSpriteFrame();
        this.createUI();
        this.initState();
    }

    private createWhiteSpriteFrame() {
        // 创建白色纹理（跨平台兼容）
        const tex = new Texture2D();
        // 使用 1x1 纯白像素数据
        const data = new Uint8Array([255, 255, 255, 255]);
        tex.reset({
            width: 1,
            height: 1,
            format: Texture2D.PixelFormat.RGBA8888,
        });
        tex.uploadData(data);
        this._whiteSpriteFrame = new SpriteFrame();
        this._whiteSpriteFrame.texture = tex;
    }

    private createUI() {
        const canvas = this.node;
        let transform = canvas.getComponent(UITransform);
        if (!transform) {
            transform = canvas.addComponent(UITransform);
        }
        // 使用设计尺寸 720x1280
        const w = DESIGN_WIDTH;
        const h = DESIGN_HEIGHT;
        transform.setContentSize(w, h);

        // 边距
        const padding = 30;
        const contentWidth = w - padding * 2; // 660

        this.createBg(canvas, w, h);
        this.createTitle(canvas, 'CloudBase Demo', new Vec3(0, h / 2 - 60, 0));
        this.statusLabel = this.createText(canvas, '初始化...', 18, new Vec3(0, h / 2 - 100, 0), Theme.textSecondary);

        this.createConfigPanel(canvas, contentWidth, padding);
        this.createLoginPanel(canvas, contentWidth, padding);
        this.createUserPanel(canvas, contentWidth, padding);
        this.createTestPanel(canvas, contentWidth, padding);

        this.hideAll();
    }

    private getSprite(): SpriteFrame | null {
        return this._whiteSpriteFrame;
    }

    private createBg(parent: Node, w: number, h: number) {
        const node = new Node('Bg');
        node.layer = UI_2D;
        node.parent = parent;
        const t = node.addComponent(UITransform);
        t.setContentSize(w, h);
        const s = node.addComponent(Sprite);
        s.type = Sprite.Type.SIMPLE;
        s.sizeMode = Sprite.SizeMode.CUSTOM;
        s.color = Theme.bgPrimary;
        s.spriteFrame = this.getSprite();
    }

    private createPanel(parent: Node, name: string, w: number, h: number, pos: Vec3): Node {
        const node = new Node(name);
        node.layer = UI_2D;
        node.parent = parent;
        node.setPosition(pos);
        const t = node.addComponent(UITransform);
        t.setContentSize(w, h);
        const s = node.addComponent(Sprite);
        s.type = Sprite.Type.SIMPLE;
        s.sizeMode = Sprite.SizeMode.CUSTOM;
        s.color = Theme.bgSecondary;
        s.spriteFrame = this.getSprite();
        return node;
    }

    private createTitle(parent: Node, text: string, pos: Vec3) {
        const node = new Node('Title');
        node.layer = UI_2D;
        node.parent = parent;
        node.setPosition(pos);
        const t = node.addComponent(UITransform);
        t.setContentSize(300, 40);
        const l = node.addComponent(Label);
        l.string = text;
        l.fontSize = 28;
        l.color = Theme.textPrimary;
        l.isBold = true;
        l.horizontalAlign = Label.HorizontalAlign.CENTER;
    }

    private createText(parent: Node, text: string, size: number, pos: Vec3, color: Color, bold = false): Label {
        const node = new Node('Text');
        node.layer = UI_2D;
        node.parent = parent;
        node.setPosition(pos);
        const t = node.addComponent(UITransform);
        t.setContentSize(320, 100);
        const l = node.addComponent(Label);
        l.string = text;
        l.fontSize = size;
        l.color = color;
        l.isBold = bold;
        l.horizontalAlign = Label.HorizontalAlign.CENTER;
        l.verticalAlign = Label.VerticalAlign.CENTER;
        l.overflow = Label.Overflow.CLAMP;
        return l;
    }

    private createInput(parent: Node, placeholder: string, pos: Vec3, w: number, isPwd = false, defaultValue = ''): EditBox {
        const h = 40;
        const node = new Node('Input');
        node.layer = UI_2D;
        node.parent = parent;
        node.setPosition(pos);
        const transform = node.addComponent(UITransform);
        transform.setContentSize(w, h);

        // 背景 Sprite 直接添加到主节点
        const sprite = node.addComponent(Sprite);
        sprite.type = Sprite.Type.SIMPLE;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.color = Theme.bgTertiary;
        sprite.spriteFrame = this.getSprite();

        // 先添加 EditBox 组件
        const eb = node.addComponent(EditBox);
        
        // 删除 EditBox 自动创建的默认子节点
        node.children.forEach(child => {
            if (child.name !== 'Input') {
                child.destroy();
            }
        });

        // 文本显示节点
        const textNode = new Node('TEXT_LABEL');
        textNode.layer = UI_2D;
        textNode.parent = node;
        const textTransform = textNode.addComponent(UITransform);
        textTransform.setContentSize(w - 20, h);
        const textLabel = textNode.addComponent(Label);
        textLabel.string = defaultValue || '';
        textLabel.fontSize = 18;
        textLabel.lineHeight = h;
        textLabel.color = Theme.textPrimary;
        textLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        textLabel.verticalAlign = Label.VerticalAlign.CENTER;
        textLabel.overflow = Label.Overflow.CLAMP;

        // 占位符节点
        const placeholderNode = new Node('PLACEHOLDER_LABEL');
        placeholderNode.layer = UI_2D;
        placeholderNode.parent = node;
        const placeholderTransform = placeholderNode.addComponent(UITransform);
        placeholderTransform.setContentSize(w - 20, h);
        const placeholderLabel = placeholderNode.addComponent(Label);
        placeholderLabel.string = placeholder;
        placeholderLabel.fontSize = 18;
        placeholderLabel.lineHeight = h;
        placeholderLabel.color = Theme.textMuted;
        placeholderLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        placeholderLabel.verticalAlign = Label.VerticalAlign.CENTER;
        placeholderLabel.overflow = Label.Overflow.CLAMP;

        // 设置 EditBox 属性
        eb.textLabel = textLabel;
        eb.placeholderLabel = placeholderLabel;
        eb.inputFlag = isPwd ? EditBox.InputFlag.PASSWORD : EditBox.InputFlag.DEFAULT;
        eb.inputMode = EditBox.InputMode.SINGLE_LINE;
        eb.returnType = EditBox.KeyboardReturnType.DONE;
        eb.maxLength = -1;
        eb.placeholder = placeholder;
        eb.string = defaultValue || '';

        return eb;
    }

    private createBtn(parent: Node, text: string, pos: Vec3, cb: () => void, color: Color, w: number): Node {
        const h = 40;
        const node = new Node('Btn');
        node.layer = UI_2D;
        node.parent = parent;
        node.setPosition(pos);
        const t = node.addComponent(UITransform);
        t.setContentSize(w, h);
        const s = node.addComponent(Sprite);
        s.type = Sprite.Type.SIMPLE;
        s.sizeMode = Sprite.SizeMode.CUSTOM;
        s.color = color;
        s.spriteFrame = this.getSprite();

        const ln = new Node('Label');
        ln.layer = UI_2D;
        ln.parent = node;
        const lt = ln.addComponent(UITransform);
        lt.setContentSize(w, h);
        const ll = ln.addComponent(Label);
        ll.string = text;
        ll.fontSize = 18;
        ll.color = Color.WHITE;
        ll.isBold = true;
        ll.horizontalAlign = Label.HorizontalAlign.CENTER;
        ll.verticalAlign = Label.VerticalAlign.CENTER;

        const btn = node.addComponent(Button);
        btn.transition = Button.Transition.SCALE;
        node.on('click', cb, this);

        return node;
    }

    private createLink(parent: Node, text: string, pos: Vec3, cb: () => void) {
        const node = new Node('Link');
        node.layer = UI_2D;
        node.parent = parent;
        node.setPosition(pos);
        const t = node.addComponent(UITransform);
        t.setContentSize(200, 30);
        const l = node.addComponent(Label);
        l.string = text;
        l.fontSize = 16;
        l.color = Theme.textSecondary;
        l.horizontalAlign = Label.HorizontalAlign.CENTER;
        const btn = node.addComponent(Button);
        btn.transition = Button.Transition.SCALE;
        node.on('click', cb, this);
    }

    // ========== 面板创建 ==========

    private createConfigPanel(parent: Node, contentWidth: number, padding: number) {
        const panelHeight = 280;
        this.configPanel = this.createPanel(parent, 'Config', contentWidth, panelHeight, new Vec3(0, 100, 0));
        const inputWidth = contentWidth - 40;
        let y = panelHeight / 2 - 40;

        this.createText(this.configPanel, '环境配置', 22, new Vec3(0, y, 0), Theme.textPrimary, true);
        y -= 55;
        this.envIdInput = this.createInput(this.configPanel, '请输入环境 ID', new Vec3(0, y, 0), inputWidth, false, cloudbaseService.getSavedConfig?.()?.env || '');
        y -= 50;
        this.accessKeyInput = this.createInput(this.configPanel, '请输入 Access Key', new Vec3(0, y, 0), inputWidth);
        y -= 55;
        this.createBtn(this.configPanel, '保存配置', new Vec3(0, y, 0), () => this.onSaveConfig(), Theme.primary, inputWidth);
    }

    private createLoginPanel(parent: Node, contentWidth: number, padding: number) {
        const panelHeight = 420;
        this.loginPanel = this.createPanel(parent, 'Login', contentWidth, panelHeight, new Vec3(0, 50, 0));
        const inputWidth = contentWidth - 40;
        let y = panelHeight / 2 - 35;

        this.createText(this.loginPanel, '用户登录', 22, new Vec3(0, y, 0), Theme.textPrimary, true);
        y -= 45;

        // 模式切换按钮
        const modeGap = 8;
        const modeWidth = (inputWidth - modeGap * 3) / 4;
        const modeStartX = -inputWidth / 2 + modeWidth / 2;
        this.createModeBtn(this.loginPanel, '密码', new Vec3(modeStartX, y, 0), 'password', modeWidth);
        this.createModeBtn(this.loginPanel, '手机', new Vec3(modeStartX + modeWidth + modeGap, y, 0), 'phone', modeWidth);
        this.createModeBtn(this.loginPanel, '邮箱', new Vec3(modeStartX + (modeWidth + modeGap) * 2, y, 0), 'email', modeWidth);
        this.createModeBtn(this.loginPanel, '匿名', new Vec3(modeStartX + (modeWidth + modeGap) * 3, y, 0), 'anonymous', modeWidth);
        y -= 55;

        this.usernameInput = this.createInput(this.loginPanel, '请输入用户名', new Vec3(0, y, 0), inputWidth);
        y -= 50;
        this.passwordInput = this.createInput(this.loginPanel, '请输入密码', new Vec3(0, y, 0), inputWidth, true);
        y -= 50;

        this.phoneInput = this.createInput(this.loginPanel, '请输入手机号', new Vec3(0, y + 100, 0), inputWidth);
        this.phoneInput.node.active = false;

        this.emailInput = this.createInput(this.loginPanel, '请输入邮箱', new Vec3(0, y + 100, 0), inputWidth);
        this.emailInput.node.active = false;

        this.otpInput = this.createInput(this.loginPanel, '请输入验证码', new Vec3(0, y + 50, 0), inputWidth);
        this.otpInput.node.active = false;

        this.createBtn(this.loginPanel, '登录', new Vec3(0, y, 0), () => this.onLogin(), Theme.primary, inputWidth);
        y -= 45;
        this.createLink(this.loginPanel, '← 返回配置', new Vec3(0, y, 0), () => this.showPanel('config'));
    }

    private createModeBtn(parent: Node, text: string, pos: Vec3, mode: LoginMode, w: number) {
        const h = 32;
        const node = new Node('Mode_' + mode);
        node.layer = UI_2D;
        node.parent = parent;
        node.setPosition(pos);
        const t = node.addComponent(UITransform);
        t.setContentSize(w, h);
        const s = node.addComponent(Sprite);
        s.type = Sprite.Type.SIMPLE;
        s.sizeMode = Sprite.SizeMode.CUSTOM;
        s.color = this.loginMode === mode ? Theme.primary : Theme.bgTertiary;
        s.spriteFrame = this.getSprite();

        const ln = new Node('Label');
        ln.layer = UI_2D;
        ln.parent = node;
        const lt = ln.addComponent(UITransform);
        lt.setContentSize(w, h);
        const ll = ln.addComponent(Label);
        ll.string = text;
        ll.fontSize = 16;
        ll.color = Color.WHITE;
        ll.horizontalAlign = Label.HorizontalAlign.CENTER;
        ll.verticalAlign = Label.VerticalAlign.CENTER;

        const btn = node.addComponent(Button);
        btn.transition = Button.Transition.SCALE;
        node.on('click', () => this.switchMode(mode), this);
    }

    private createUserPanel(parent: Node, contentWidth: number, padding: number) {
        const panelHeight = 320;
        this.userPanel = this.createPanel(parent, 'User', contentWidth, panelHeight, new Vec3(0, 100, 0));
        const inputWidth = contentWidth - 40;
        let y = panelHeight / 2 - 35;

        this.createText(this.userPanel, '用户信息', 22, new Vec3(0, y, 0), Theme.textPrimary, true);
        y -= 60;
        this.userInfoLabel = this.createText(this.userPanel, '加载中...', 16, new Vec3(0, y, 0), Theme.textSecondary);
        y -= 70;
        this.createBtn(this.userPanel, '功能调试', new Vec3(0, y, 0), () => this.showPanel('test'), Theme.primary, inputWidth);
        y -= 50;
        this.createBtn(this.userPanel, '退出登录', new Vec3(0, y, 0), () => this.onSignOut(), Theme.danger, inputWidth);
        y -= 40;
        this.createLink(this.userPanel, '修改配置', new Vec3(0, y, 0), () => {
            cloudbaseService.clearConfig();
            authService.signOut();
            this.showPanel('config');
        });
    }

    private createTestPanel(parent: Node, contentWidth: number, padding: number) {
        const panelHeight = 580;
        this.testPanel = this.createPanel(parent, 'Test', contentWidth, panelHeight, new Vec3(0, 0, 0));
        const inputWidth = contentWidth - 40;
        let y = panelHeight / 2 - 35;

        this.createText(this.testPanel, '功能调试', 22, new Vec3(0, y, 0), Theme.textPrimary, true);
        y -= 45;

        // 云函数测试
        this.createText(this.testPanel, '云函数调用', 16, new Vec3(-inputWidth / 2 + 50, y, 0), Theme.textSecondary);
        y -= 40;
        this.functionNameInput = this.createInput(this.testPanel, '云函数名称', new Vec3(0, y, 0), inputWidth);
        y -= 45;
        this.functionDataInput = this.createInput(this.testPanel, '参数 JSON', new Vec3(0, y, 0), inputWidth);
        y -= 45;
        this.createBtn(this.testPanel, '调用函数', new Vec3(0, y, 0), () => this.onCallFunction(), Theme.primary, inputWidth);
        y -= 55;

        // Models 测试
        this.createText(this.testPanel, 'Models 数据模型', 16, new Vec3(-inputWidth / 2 + 60, y, 0), Theme.textSecondary);
        y -= 40;
        this.modelNameInput = this.createInput(this.testPanel, '模型名称 (如: todos)', new Vec3(0, y, 0), inputWidth);
        y -= 45;
        this.modelMethodInput = this.createInput(this.testPanel, '方法 (list/get/create/update/delete)', new Vec3(0, y, 0), inputWidth, false, 'list');
        y -= 45;
        this.modelParamsInput = this.createInput(this.testPanel, '参数 JSON (可选)', new Vec3(0, y, 0), inputWidth);
        y -= 45;
        this.createBtn(this.testPanel, '调用 Models', new Vec3(0, y, 0), () => this.onCallModels(), Theme.primary, inputWidth);
        y -= 50;

        this.resultLabel = this.createText(this.testPanel, '等待调用...', 16, new Vec3(0, y, 0), Theme.textMuted);
        y -= 35;
        this.createLink(this.testPanel, '← 返回', new Vec3(0, y, 0), () => this.showPanel('user'));
    }

    // ========== 状态管理 ==========

    private initState() {
        if (cloudbaseService.isConfigured()) {
            const cfg = cloudbaseService.getSavedConfig();
            if (cfg && this.envIdInput && this.accessKeyInput) {
                this.envIdInput.string = cfg.env;
                this.accessKeyInput.string = cfg.accessKey || '';
            }
            if (authService.isLoggedIn()) {
                this.showPanel('user');
                this.updateUserInfo();
            } else {
                this.showPanel('login');
            }
        } else {
            this.showPanel('config');
        }
    }

    private hideAll() {
        if (this.configPanel) this.configPanel.active = false;
        if (this.loginPanel) this.loginPanel.active = false;
        if (this.userPanel) this.userPanel.active = false;
        if (this.testPanel) this.testPanel.active = false;
    }

    private showPanel(p: 'config' | 'login' | 'user' | 'test') {
        this.hideAll();
        if (p === 'config' && this.configPanel) {
            this.configPanel.active = true;
            this.setStatus('请配置环境');
        } else if (p === 'login' && this.loginPanel) {
            this.loginPanel.active = true;
            this.setStatus('请登录');
        } else if (p === 'user' && this.userPanel) {
            this.userPanel.active = true;
            this.setStatus('已登录');
            this.updateUserInfo();
        } else if (p === 'test' && this.testPanel) {
            this.testPanel.active = true;
            this.setStatus('功能调试');
        }
    }

    private setStatus(t: string) {
        if (this.statusLabel) this.statusLabel.string = t;
    }

    private switchMode(mode: LoginMode) {
        this.loginMode = mode;
        this.otpSent = false;
        this.verifyOtpFn = null;

        // 更新按钮
        if (this.loginPanel) {
            (['password', 'phone', 'email', 'anonymous'] as LoginMode[]).forEach(m => {
                const btn = this.loginPanel!.getChildByName('Mode_' + m);
                if (btn) {
                    const sp = btn.getComponent(Sprite);
                    if (sp) sp.color = m === mode ? Theme.primary : Theme.bgTertiary;
                }
            });
        }

        // 显示/隐藏输入框
        const showPwd = mode === 'password';
        const showPhone = mode === 'phone';
        const showEmail = mode === 'email';

        if (this.usernameInput) this.usernameInput.node.active = showPwd;
        if (this.passwordInput) this.passwordInput.node.active = showPwd;
        if (this.phoneInput) this.phoneInput.node.active = showPhone;
        if (this.emailInput) this.emailInput.node.active = showEmail;
        if (this.otpInput) this.otpInput.node.active = false;

        this.setStatus(mode === 'anonymous' ? '点击登录' : `${mode}登录`);
    }

    private updateUserInfo() {
        const u = authService.getUser();
        if (this.userInfoLabel) {
            if (u) {
                const info = [
                    `UID: ${u.uid || '未知'}`,
                    `类型: ${u.loginType || '未知'}`,
                    u.username ? `用户名: ${u.username}` : '',
                    u.email ? `邮箱: ${u.email}` : '',
                    u.phone ? `手机: ${u.phone}` : '',
                ].filter(Boolean).join('\n');
                this.userInfoLabel.string = info;
            } else {
                this.userInfoLabel.string = '未登录';
            }
        }
    }

    // ========== 事件 ==========

    private async onSaveConfig() {
        const env = this.envIdInput?.string?.trim();
        const accessKey = this.accessKeyInput?.string?.trim();
        if (!env) {
            this.setStatus('请输入环境 ID');
            return;
        }
        try {
            cloudbaseService.init({ env, accessKey, region: 'ap-shanghai' });
            this.setStatus('配置成功');
            this.showPanel('login');
        } catch (e: any) {
            this.setStatus(`配置失败: ${e.message || e}`);
        }
    }

    private async onLogin() {
        this.setStatus('登录中...');
        try {
            if (this.loginMode === 'password') {
                const u = this.usernameInput?.string?.trim();
                const p = this.passwordInput?.string?.trim();
                if (!u || !p) { this.setStatus('请输入用户名和密码'); return; }
                const r = await authService.signInWithPassword(u, p);
                if (r.error) { this.setStatus(`失败: ${r.error.message || r.error}`); return; }
                this.showPanel('user');
            } else if (this.loginMode === 'phone') {
                await this.loginOtp(this.phoneInput?.string?.trim(), 'phone');
            } else if (this.loginMode === 'email') {
                await this.loginOtp(this.emailInput?.string?.trim(), 'email');
            } else {
                const r = await authService.signInAnonymously();
                if (r.error) { this.setStatus(`失败: ${r.error.message || r.error}`); return; }
                this.showPanel('user');
            }
        } catch (e: any) {
            this.setStatus(`登录失败: ${e.message || e}`);
        }
    }

    private async loginOtp(val: string | undefined, type: 'phone' | 'email') {
        if (!val) { this.setStatus(`请输入${type === 'phone' ? '手机号' : '邮箱'}`); return; }
        if (!this.otpSent) {
            const r = type === 'phone' ? await authService.sendPhoneOtp(val) : await authService.sendEmailOtp(val);
            if (r.error) { this.setStatus(`发送失败: ${r.error.message || r.error}`); return; }
            this.verifyOtpFn = r.verifyOtp || null;
            this.otpSent = true;
            if (this.otpInput) this.otpInput.node.active = true;
            this.setStatus('验证码已发送');
        } else {
            const code = this.otpInput?.string?.trim();
            if (!code) { this.setStatus('请输入验证码'); return; }
            if (this.verifyOtpFn) {
                const r = await this.verifyOtpFn(code);
                if (r?.error) { this.setStatus(`验证失败: ${r.error.message || r.error}`); return; }
                this.showPanel('user');
            }
        }
    }

    private async onSignOut() {
        await authService.signOut();
        this.showPanel('login');
        this.setStatus('已退出');
    }

    private async onCallFunction() {
        const name = this.functionNameInput?.string?.trim();
        if (!name) { this.setResult('请输入函数名'); return; }
        let data = {};
        const ds = this.functionDataInput?.string?.trim();
        if (ds) {
            try { data = JSON.parse(ds); } catch { this.setResult('JSON格式错误'); return; }
        }
        this.setResult('调用中...');
        try {
            const r = await cloudbaseService.callFunction({ name, data });
            this.setResult(JSON.stringify(r));
        } catch (e: any) {
            console.log('===== onCallFunction err ========', e)
            this.setResult(`调用失败: ${e.message || e}`);
        }
    }

    private async onRefreshUser() {
        await authService.getCurrentUser();
        this.updateUserInfo();
        this.setResult('已刷新');
    }

    private async onCallModels() {
        const modelName = this.modelNameInput?.string?.trim();
        const method = this.modelMethodInput?.string?.trim()?.toLowerCase() || 'list';
        if (!modelName) {
            this.setResult('请输入模型名称');
            return;
        }

        let params: any = {};
        const paramsStr = this.modelParamsInput?.string?.trim();
        if (paramsStr) {
            try {
                params = JSON.parse(paramsStr);
            } catch {
                this.setResult('参数 JSON 格式错误');
                return;
            }
        }

        this.setResult('调用中...');
        try {
            const models = cloudbaseService.getModels();
            if (!models) {
                this.setResult('Models 未初始化');
                return;
            }

            const model = models[modelName];
            if (!model) {
                this.setResult(`模型 "${modelName}" 不存在`);
                return;
            }

            let result: any;
            switch (method) {
                case 'list':
                    result = await model.list(params);
                    break;
                case 'get':
                    if (!params._id) {
                        this.setResult('get 方法需要 _id 参数');
                        return;
                    }
                    result = await model.get({ filter: { _id: params._id } });
                    break;
                case 'create':
                    if (!params.data) {
                        this.setResult('create 方法需要 data 参数');
                        return;
                    }
                    result = await model.create({ data: params.data });
                    break;
                case 'update':
                    if (!params._id || !params.data) {
                        this.setResult('update 方法需要 _id 和 data 参数');
                        return;
                    }
                    result = await model.update({
                        filter: { _id: params._id },
                        data: params.data
                    });
                    break;
                case 'delete':
                    if (!params._id) {
                        this.setResult('delete 方法需要 _id 参数');
                        return;
                    }
                    result = await model.delete({ filter: { _id: params._id } });
                    break;
                default:
                    this.setResult(`不支持的方法: ${method}`);
                    return;
            }

            console.log('=== Models 调用结果 ===', result);
            this.setResult(JSON.stringify(result));
        } catch (e: any) {
            console.log('=== Models 调用失败 ===', e);
            this.setResult(`调用失败: ${e.message || e}`);
        }
    }

    private setResult(t: string) {
        if (this.resultLabel) this.resultLabel.string = t.substring(0, 300);
    }
}
