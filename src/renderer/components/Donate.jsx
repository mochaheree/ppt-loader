// Same content and structure as CUEVO BeatSync's donate tab. Kept calm on
// purpose: PPT Loader runs during a show, so a donation page that pushes hard
// would feel out of place next to it.
//
// Fork note: everything specific to this project lives in this file -- the
// Saweria link, the QRIS name/NMID, and the contact list below.
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ArrowSquareOut,
  Check,
  Copy,
  EnvelopeSimple,
  GithubLogo,
  InstagramLogo,
  TiktokLogo,
} from '@phosphor-icons/react';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import qris from '../assets/qris.png';

const SAWERIA_URL = 'https://saweria.co/cuevo';
const QRIS_NAME = 'Mocha Heree';
const QRIS_NMID = 'NMID ID1026526607985';

const CONTACTS = [
  { Icon: TiktokLogo, label: 'TikTok', handle: '@gevan.py', url: 'https://www.tiktok.com/@gevan.py' },
  { Icon: InstagramLogo, label: 'Instagram', handle: '@gevan.py', url: 'https://www.instagram.com/gevan.py/' },
  { Icon: GithubLogo, label: 'GitHub', handle: 'mochaheree', url: 'https://github.com/mochaheree' },
  { Icon: EnvelopeSimple, label: 'Email', handle: 'putra.gevan00@gmail.com', url: 'mailto:putra.gevan00@gmail.com' },
];

export default function Donate() {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copyLink = useCallback(async () => {
    // Routed through the main process, which always has clipboard access.
    const res = await window.api.copyText(SAWERIA_URL);
    if (!res.ok) return;
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }, []);

  return (
    <div className="mx-auto grid w-full max-w-[960px] gap-4">
      <Card title="Support CUEVO PPT Loader">
        <div className="grid gap-3 text-[13px] leading-relaxed text-muted-foreground">
          <p>
            If you found this project helpful, consider supporting it with a donation. Any amount is
            appreciated and helps keep it maintained and improved.
          </p>
          <p>
            Looking for a custom app, tool, or have an idea you&apos;d like built? Feel free to reach
            out — see contacts below.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          title="Saweria"
          description="Opens in your browser. Accepts QRIS, bank transfer, and most Indonesian e-wallets."
        >
          <div className="grid gap-3">
            <div
              className="rounded-md border border-border bg-secondary/40 px-3 py-2.5
                font-mono text-[12px] text-foreground/85"
            >
              {SAWERIA_URL}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => window.open(SAWERIA_URL, '_blank')}>
                <ArrowSquareOut size={15} /> Open Saweria
              </Button>
              <Button variant="outline" onClick={copyLink}>
                {copied ? (
                  <>
                    <Check size={15} className="text-primary-bright" /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={15} /> Copy link
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <Card
          title="QRIS"
          description="Scan with DANA, GoPay, OVO, ShopeePay, LinkAja, or any banking app."
        >
          <div className="grid gap-3">
            {/* White backing: a QR code needs bright/dark contrast to scan, and on
                this dark card a transparent background can fail a real scan. */}
            <div className="flex justify-center rounded-md bg-white p-3">
              <img src={qris} alt="QRIS payment code" width="230" height="230" className="block" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-foreground">{QRIS_NAME}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{QRIS_NMID}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Contact">
        <div className="flex flex-wrap gap-2">
          {CONTACTS.map(({ Icon, label, handle, url }) => (
            <Button key={label} variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
              <Icon size={14} /> {label} <span className="text-muted-foreground">{handle}</span>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
