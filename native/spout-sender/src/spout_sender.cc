#include <napi.h>
#include "SpoutDX.h"

namespace {

class SpoutSender : public Napi::ObjectWrap<SpoutSender> {
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "SpoutSender", {
      InstanceMethod("sendFrame", &SpoutSender::SendFrame),
      InstanceMethod("close", &SpoutSender::Close),
    });
    exports.Set("SpoutSender", func);
    return exports;
  }

  SpoutSender(const Napi::CallbackInfo& info) : Napi::ObjectWrap<SpoutSender>(info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
      Napi::TypeError::New(env, "sender name (string) required").ThrowAsJavaScriptException();
      return;
    }

    std::string name = info[0].As<Napi::String>().Utf8Value();

    if (!spout_.OpenDirectX11()) {
      Napi::Error::New(env, "failed to open DirectX11 device").ThrowAsJavaScriptException();
      return;
    }

    spout_.SetSenderName(name.c_str());
    open_ = true;
  }

  ~SpoutSender() { Release(); }

 private:
  spoutDX spout_;
  bool open_ = false;

  void Release() {
    if (open_) {
      spout_.ReleaseSender();
      spout_.CloseDirectX11();
      open_ = false;
    }
  }

  // sendFrame(buffer, width, height) — buffer must be BGRA, 4 bytes per pixel,
  // matching both Electron's nativeImage bitmap and SpoutDX's default format.
  Napi::Value SendFrame(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!open_) {
      Napi::Error::New(env, "sender is closed").ThrowAsJavaScriptException();
      return env.Undefined();
    }

    if (info.Length() < 3 || !info[0].IsBuffer() || !info[1].IsNumber() || !info[2].IsNumber()) {
      Napi::TypeError::New(env, "sendFrame(buffer, width, height) required")
          .ThrowAsJavaScriptException();
      return env.Undefined();
    }

    Napi::Buffer<unsigned char> buffer = info[0].As<Napi::Buffer<unsigned char>>();
    unsigned int width = info[1].As<Napi::Number>().Uint32Value();
    unsigned int height = info[2].As<Napi::Number>().Uint32Value();

    if (buffer.Length() < static_cast<size_t>(width) * height * 4) {
      Napi::RangeError::New(env, "buffer too small for width * height * 4")
          .ThrowAsJavaScriptException();
      return env.Undefined();
    }

    bool ok = spout_.SendImage(buffer.Data(), width, height);
    return Napi::Boolean::New(env, ok);
  }

  Napi::Value Close(const Napi::CallbackInfo& info) {
    Release();
    return info.Env().Undefined();
  }
};

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  return SpoutSender::Init(env, exports);
}

}  // namespace

NODE_API_MODULE(spout_sender, InitAll)
