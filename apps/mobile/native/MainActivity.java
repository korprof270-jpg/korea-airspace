package kr.fpvproject.game;

import android.content.Context;
import android.hardware.input.InputManager;
import android.os.Bundle;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

// 안드로이드 웹뷰는 Gamepad API 를 지원하지 않는다.
// 그래서 앱이 게임패드·RC 조종기의 키/축 입력을 직접 읽어 window.__nativePad(...) 로 게임에 넘겨준다 (sim/js/nativepad.js)
public class MainActivity extends BridgeActivity implements InputManager.InputDeviceListener {

    // 표준 배치(W3C standard gamepad) 버튼 번호
    private static final int[][] STD_KEYS = {
        {KeyEvent.KEYCODE_BUTTON_A, 0}, {KeyEvent.KEYCODE_BUTTON_B, 1}, {KeyEvent.KEYCODE_BUTTON_X, 2}, {KeyEvent.KEYCODE_BUTTON_Y, 3},
        {KeyEvent.KEYCODE_BUTTON_L1, 4}, {KeyEvent.KEYCODE_BUTTON_R1, 5}, {KeyEvent.KEYCODE_BUTTON_L2, 6}, {KeyEvent.KEYCODE_BUTTON_R2, 7},
        {KeyEvent.KEYCODE_BUTTON_SELECT, 8}, {KeyEvent.KEYCODE_BACK, 8}, {KeyEvent.KEYCODE_BUTTON_START, 9}, {KeyEvent.KEYCODE_MENU, 9},
        {KeyEvent.KEYCODE_BUTTON_THUMBL, 10}, {KeyEvent.KEYCODE_BUTTON_THUMBR, 11},
        {KeyEvent.KEYCODE_DPAD_UP, 12}, {KeyEvent.KEYCODE_DPAD_DOWN, 13}, {KeyEvent.KEYCODE_DPAD_LEFT, 14}, {KeyEvent.KEYCODE_DPAD_RIGHT, 15},
        {KeyEvent.KEYCODE_BUTTON_MODE, 16},
    };
    // 조종기(조이스틱) 축 순서: 데스크톱 브라우저와 같은 HID 순서 X, Y, Z, Rx, Ry, Rz, 슬라이더…
    private static final int[] JOY_AXES = {
        MotionEvent.AXIS_X, MotionEvent.AXIS_Y, MotionEvent.AXIS_Z, MotionEvent.AXIS_RX, MotionEvent.AXIS_RY, MotionEvent.AXIS_RZ,
        MotionEvent.AXIS_THROTTLE, MotionEvent.AXIS_RUDDER, MotionEvent.AXIS_WHEEL, MotionEvent.AXIS_HAT_X, MotionEvent.AXIS_HAT_Y,
    };

    private static class Pad {
        String name; boolean std; float[] axes; float[] buttons; long sentAt; boolean dirty;
    }
    private final Map<Integer, Pad> pads = new HashMap<>();

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        InputManager im = (InputManager) getSystemService(Context.INPUT_SERVICE);
        if (im != null) im.registerInputDeviceListener(this, null);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {   // 전체 화면(몰입 모드)
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }

    private static boolean isPadSource(int src) {
        return (src & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD || (src & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK;
    }

    private Pad pad(InputDevice dev) {
        Pad p = pads.get(dev.getId());
        if (p == null) {
            p = new Pad();
            p.name = dev.getName();
            int src = dev.getSources();
            p.std = (src & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD;
            p.axes = new float[p.std ? 4 : JOY_AXES.length];
            p.buttons = new float[p.std ? 17 : 32];
            pads.put(dev.getId(), p);
        }
        return p;
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        InputDevice dev = e.getDevice();
        if (dev == null || dev.isVirtual() || !isPadSource(dev.getSources())) return super.dispatchKeyEvent(e);
        int code = e.getKeyCode();
        // 패드의 십자키·B·뒤로 키가 앱 뒤로가기나 웹뷰 포커스 이동으로 새지 않게 모두 여기서 처리
        Pad p = pad(dev);
        int idx = -1;
        if (p.std) {
            for (int[] k : STD_KEYS) if (k[0] == code) { idx = k[1]; break; }
        } else if (code >= KeyEvent.KEYCODE_BUTTON_1 && code <= KeyEvent.KEYCODE_BUTTON_16) {
            idx = code - KeyEvent.KEYCODE_BUTTON_1;
        } else {
            for (int[] k : STD_KEYS) if (k[0] == code) { idx = 16 + k[1] % 16; break; }   // 조이스틱의 A/B 등 이름 붙은 키는 뒤쪽 번호로
        }
        if (idx < 0 || idx >= p.buttons.length) return super.dispatchKeyEvent(e);
        if (e.getAction() == KeyEvent.ACTION_DOWN) p.buttons[idx] = 1f;
        else if (e.getAction() == KeyEvent.ACTION_UP) p.buttons[idx] = 0f;
        send(dev.getId(), p, true);
        return true;
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent e) {
        InputDevice dev = e.getDevice();
        if (dev == null || !isPadSource(e.getSource()) || e.getAction() != MotionEvent.ACTION_MOVE) return super.dispatchGenericMotionEvent(e);
        Pad p = pad(dev);
        if (p.std) {
            p.axes[0] = axis(e, dev, MotionEvent.AXIS_X);
            p.axes[1] = axis(e, dev, MotionEvent.AXIS_Y);
            p.axes[2] = axis(e, dev, MotionEvent.AXIS_Z);
            p.axes[3] = axis(e, dev, MotionEvent.AXIS_RZ);
            p.buttons[6] = Math.max(axis(e, dev, MotionEvent.AXIS_LTRIGGER), axis(e, dev, MotionEvent.AXIS_BRAKE));
            p.buttons[7] = Math.max(axis(e, dev, MotionEvent.AXIS_RTRIGGER), axis(e, dev, MotionEvent.AXIS_GAS));
            float hx = axis(e, dev, MotionEvent.AXIS_HAT_X), hy = axis(e, dev, MotionEvent.AXIS_HAT_Y);
            if (dev.getMotionRange(MotionEvent.AXIS_HAT_X) != null) {   // 십자키가 축으로 오는 패드
                p.buttons[12] = hy < -0.5f ? 1f : 0f; p.buttons[13] = hy > 0.5f ? 1f : 0f;
                p.buttons[14] = hx < -0.5f ? 1f : 0f; p.buttons[15] = hx > 0.5f ? 1f : 0f;
            }
        } else {
            for (int i = 0; i < JOY_AXES.length; i++) p.axes[i] = axis(e, dev, JOY_AXES[i]);
        }
        send(dev.getId(), p, false);
        return true;
    }

    // -1..1 로 맞춘 축 값 (트리거·스로틀처럼 0..1 범위인 축은 그대로)
    private static float axis(MotionEvent e, InputDevice dev, int a) {
        InputDevice.MotionRange r = dev.getMotionRange(a, e.getSource());
        if (r == null) return 0f;
        float v = e.getAxisValue(a);
        if (r.getMin() >= 0f) return r.getMax() > 0 ? v / r.getMax() : v;
        float flat = r.getFlat();
        return Math.abs(v) <= flat * 0.5f ? 0f : v;
    }

    // 웹뷰로 전달: 축 움직임은 초당 120번 정도로 묶어 보내고, 버튼은 바로
    private void send(int id, Pad p, boolean now) {
        long t = System.nanoTime();
        WebView wv = getBridge() != null ? getBridge().getWebView() : null;
        if (wv == null) return;
        if (!now && t - p.sentAt < 8_000_000L) {   // 너무 잦으면 잠깐 뒤에 마지막 값을 한 번 보낸다 (중앙 복귀 값이 빠지지 않게)
            if (!p.dirty) { p.dirty = true; wv.postDelayed(() -> { if (p.dirty && pads.get(id) == p) send(id, p, true); }, 9); }
            return;
        }
        p.sentAt = t; p.dirty = false;
        StringBuilder sb = new StringBuilder(160);
        sb.append("window.__nativePad&&window.__nativePad(").append(id).append(',').append(quote(p.name)).append(',').append(p.std).append(",[");
        for (int i = 0; i < p.axes.length; i++) { if (i > 0) sb.append(','); sb.append(String.format(Locale.US, "%.4f", p.axes[i])); }
        sb.append("],[");
        for (int i = 0; i < p.buttons.length; i++) { if (i > 0) sb.append(','); sb.append(String.format(Locale.US, "%.3f", p.buttons[i])); }
        sb.append("])");
        final String js = sb.toString();
        wv.post(() -> wv.evaluateJavascript(js, null));
    }

    private static String quote(String s) {
        if (s == null) s = "Gamepad";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    @Override public void onInputDeviceAdded(int id) {}
    @Override public void onInputDeviceChanged(int id) {}
    @Override
    public void onInputDeviceRemoved(int id) {
        if (pads.remove(id) == null) return;
        WebView wv = getBridge() != null ? getBridge().getWebView() : null;
        if (wv != null) wv.post(() -> wv.evaluateJavascript("window.__nativePadGone&&window.__nativePadGone(" + id + ")", null));
    }
}
