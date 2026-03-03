import * as readline from "readline";

// ─── Types ───────────────────────────────────────────────────────────────────

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank =
  | "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10"
  | "J" | "Q" | "K";

interface Card       { suit: Suit; rank: Rank; }
interface PlayerHand { cards: Card[]; bet: number; }
interface Stats      { wins: number; losses: number; pushes: number; bjs: number; }

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function createDeck(): Card[] {
  return SUITS.flatMap(s => RANKS.map(r => ({ suit: s, rank: r })));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function value(hand: Card[]): number {
  let v = 0, aces = 0;
  for (const { rank } of hand) {
    if (rank === "A") { aces++; v += 11; }
    else if (["J","Q","K"].includes(rank)) v += 10;
    else v += +rank;
  }
  while (v > 21 && aces-- > 0) v -= 10;
  return v;
}

const isBlackjack = (h: Card[]) => h.length === 2 && value(h) === 21;
const canSplit     = (h: Card[]) => h.length === 2 && h[0].rank === h[1].rank;
const fmt          = (c: Card)   => `${c.rank}${c.suit}`;
const fmtHand      = (h: Card[], hide = false) =>
  hide ? `${fmt(h[0])}  🂠` : h.map(fmt).join("  ");

// ─── Game ─────────────────────────────────────────────────────────────────────

class Blackjack {
  private deck:        Card[]       = [];
  private playerHands: PlayerHand[] = [];
  private dealerHand:  Card[]       = [];
  private chips  = 100;
  private stats: Stats = { wins: 0, losses: 0, pushes: 0, bjs: 0 };
  private rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  private ask = (q: string) => new Promise<string>(r => this.rl.question(q, r));

  // ── Deck ──────────────────────────────────────────────────────────────────

  private draw(): Card {
    if (this.deck.length < 15) this.deck = shuffle(createDeck());
    return this.deck.pop()!;
  }

  // ── Display ───────────────────────────────────────────────────────────────

  private display(hideDealer: boolean, activeIdx = 0): void {
    console.clear();
    const { wins, losses, pushes, bjs } = this.stats;
    console.log("┌──────────────────────────────────────┐");
    console.log("│            ♠  BLACKJACK  ♠            │");
    console.log("└──────────────────────────────────────┘");
    console.log(`  💰 Chips: ${this.chips}   W:${wins} L:${losses} P:${pushes} BJ:${bjs}`);
    console.log("────────────────────────────────────────");

    const dv = hideDealer ? "?" : `${value(this.dealerHand)}`;
    console.log(`  Dealer [${dv}]  ${fmtHand(this.dealerHand, hideDealer)}`);
    console.log("────────────────────────────────────────");

    for (let i = 0; i < this.playerHands.length; i++) {
      const h   = this.playerHands[i];
      const v   = value(h.cards);
      const tag = this.playerHands.length > 1 ? `Hand ${i + 1}` : "You  ";
      const ptr = this.playerHands.length > 1 && i === activeIdx ? " ◀" : "";
      const bst = v > 21 ? " BUST" : "";
      console.log(`  ${tag} [${v}${bst}] bet:${h.bet}${ptr}  ${fmtHand(h.cards)}`);
    }

    console.log("────────────────────────────────────────");
  }

  // ── Bet ───────────────────────────────────────────────────────────────────

  private async placeBet(): Promise<number | null> {
    console.clear();
    if (this.chips <= 0) { console.log("  Out of chips — game over!\n"); return null; }

    const { wins, losses, pushes, bjs } = this.stats;
    console.log("┌──────────────────────────────────────┐");
    console.log("│            ♠  BLACKJACK  ♠            │");
    console.log("└──────────────────────────────────────┘");
    console.log(`  💰 Chips: ${this.chips}   W:${wins} L:${losses} P:${pushes} BJ:${bjs}\n`);

    const raw = await this.ask(`  Bet (1–${this.chips}): `);
    const n   = parseInt(raw, 10);
    if (isNaN(n) || n < 1 || n > this.chips) {
      console.log("  Invalid — try again."); await this.ask("  [enter]");
      return this.placeBet();
    }
    return n;
  }

  // ── Player turn ───────────────────────────────────────────────────────────

  /** Play a single hand at `idx`. Chips for doubles/splits are deducted inline. */
  private async playHand(idx: number): Promise<void> {
    const hand = this.playerHands[idx];
    let firstAction = true;

    while (true) {
      const v = value(hand.cards);
      if (v >= 21) break;

      this.display(true, idx);

      const canDbl   = firstAction && this.chips >= hand.bet;
      const canSplNow = firstAction && canSplit(hand.cards)
                        && this.chips >= hand.bet
                        && this.playerHands.length < 4;

      let prompt = "  [h] Hit  [s] Stand";
      if (canDbl)   prompt += "  [d] Double";
      if (canSplNow) prompt += "  [p] Split";
      prompt += " : ";

      const a = (await this.ask(prompt)).toLowerCase().trim();

      if (a === "h") {
        hand.cards.push(this.draw());
        firstAction = false;

      } else if (a === "s") {
        break;

      } else if (a === "d" && canDbl) {
        // Double: commit extra chips, double bet, one card only
        this.chips -= hand.bet;
        hand.bet   *= 2;
        hand.cards.push(this.draw());
        break;

      } else if (a === "p" && canSplNow) {
        // Split: pull second card, create new hand, refill both
        const splitCard = hand.cards.pop()!;
        this.chips -= hand.bet;
        this.playerHands.splice(idx + 1, 0, {
          cards: [splitCard, this.draw()],
          bet: hand.bet,
        });
        hand.cards.push(this.draw());
        firstAction = true; // fresh 2-card hand — can double/re-split
      }
    }
  }

  private async playerTurn(): Promise<void> {
    // loop length may grow if player splits
    for (let i = 0; i < this.playerHands.length; i++) {
      await this.playHand(i);
    }
  }

  // ── Dealer turn ───────────────────────────────────────────────────────────

  private dealerPlay(): void {
    while (value(this.dealerHand) < 17) this.dealerHand.push(this.draw());
  }

  // ── Resolution ────────────────────────────────────────────────────────────

  /**
   * Chip accounting:
   *   Chips are deducted when bets are placed (initial + double + split).
   *   On resolution we pay out:
   *     BJ win   → bet returned + 1.5× profit   (chips += bet + floor(bet × 1.5))
   *     Win      → bet returned + equal profit   (chips += bet × 2)
   *     Push     → bet returned                  (chips += bet)
   *     Loss     → nothing (chips already gone)
   */
  private resolveHand(hand: PlayerHand): { profit: number; msg: string } {
    const pv  = value(hand.cards);
    const dv  = value(this.dealerHand);
    const pBJ = isBlackjack(hand.cards);
    const dBJ = isBlackjack(this.dealerHand);

    if (pBJ && dBJ) {
      this.stats.pushes++;
      this.chips += hand.bet;
      return { profit: 0, msg: "🤝 Both BJ — Push" };
    }
    if (pBJ) {
      const win = Math.floor(hand.bet * 1.5);
      this.stats.bjs++; this.stats.wins++;
      this.chips += hand.bet + win;
      return { profit: win, msg: `🃏 BLACKJACK! +${win}` };
    }
    if (dBJ) {
      this.stats.losses++;
      return { profit: -hand.bet, msg: `😬 Dealer BJ  -${hand.bet}` };
    }
    if (pv > 21) {
      this.stats.losses++;
      return { profit: -hand.bet, msg: `💥 Bust  -${hand.bet}` };
    }
    if (dv > 21) {
      this.stats.wins++;
      this.chips += hand.bet * 2;
      return { profit: hand.bet, msg: `🎉 Dealer busts  +${hand.bet}` };
    }
    if (pv > dv) {
      this.stats.wins++;
      this.chips += hand.bet * 2;
      return { profit: hand.bet, msg: `🎉 You win  +${hand.bet}` };
    }
    if (dv > pv) {
      this.stats.losses++;
      return { profit: -hand.bet, msg: `😔 Dealer wins  -${hand.bet}` };
    }
    this.stats.pushes++;
    this.chips += hand.bet;
    return { profit: 0, msg: "🤝 Push" };
  }

  private async resolveRound(): Promise<void> {
    this.display(false);
    let net = 0;
    for (let i = 0; i < this.playerHands.length; i++) {
      const { profit, msg } = this.resolveHand(this.playerHands[i]);
      net += profit;
      const prefix = this.playerHands.length > 1 ? `Hand ${i + 1}: ` : "";
      console.log(`  ${prefix}${msg}`);
    }
    if (this.playerHands.length > 1) {
      console.log(`  ─── Net: ${net >= 0 ? "+" : ""}${net}`);
    }
    console.log(`  💰 Chips: ${this.chips}\n`);
  }

  // ── Round ─────────────────────────────────────────────────────────────────

  private async playRound(): Promise<void> {
    const bet = await this.placeBet();
    if (bet === null) return;

    // Deduct initial bet, deal cards
    this.chips -= bet;
    this.playerHands = [{ cards: [this.draw(), this.draw()], bet }];
    this.dealerHand  = [this.draw(), this.draw()];

    const pBJ = isBlackjack(this.playerHands[0].cards);
    const dBJ = isBlackjack(this.dealerHand);

    if (pBJ || dBJ) {
      // Immediate resolve — no player/dealer turn
      this.display(false);
      if (pBJ && dBJ) {
        this.stats.pushes++;
        this.chips += bet;
        console.log("\n  🤝 Both Blackjack — Push!");
      } else if (pBJ) {
        const win = Math.floor(bet * 1.5);
        this.stats.bjs++; this.stats.wins++;
        this.chips += bet + win;
        console.log(`\n  🃏 BLACKJACK! +${win}`);
      } else {
        this.stats.losses++;
        console.log(`\n  😬 Dealer Blackjack — you lose.`);
      }
      console.log(`  💰 Chips: ${this.chips}\n`);
      return;
    }

    await this.playerTurn();

    // Dealer only plays if at least one player hand can still beat them
    if (this.playerHands.some(h => value(h.cards) <= 21)) {
      this.dealerPlay();
    }

    await this.resolveRound();
  }

  // ── Main loop ─────────────────────────────────────────────────────────────

  async run(): Promise<void> {
    this.deck = shuffle(createDeck());

    while (true) {
      await this.playRound();

      if (this.chips <= 0) { console.log("  Out of chips!\n"); break; }

      const again = await this.ask("  Play again? [y/n]: ");
      if (again.toLowerCase() !== "y") break;
    }

    const { wins, losses, pushes, bjs } = this.stats;
    console.log(`\n  Final chips : ${this.chips}`);
    console.log(`  Record      : W:${wins}  L:${losses}  P:${pushes}  BJ:${bjs}`);
    console.log("\n  Thanks for playing! 🃏\n");
    this.rl.close();
  }
}

new Blackjack().run().catch(err => { console.error(err); process.exit(1); });
