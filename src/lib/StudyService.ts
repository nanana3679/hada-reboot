import { createFSRS } from '@/utils/FSRS';

import { CardDetail } from '@/types/schemes';
import { Grade, Rating, State } from 'ts-fsrs';
import { STATE_MAP } from '@/constants/study';
import { StateCounts } from '@/types/study';

export class StudyService {
  private f = createFSRS();
  private _queue: CardDetail[] = [];
  private backupQueue: CardDetail[] = [];

  constructor(initialQueue: CardDetail[]) {
    this.queue = initialQueue.sort((a, b) => this.compareCards(a, b));
  }

  public logQueue() {
    if (process.env.NODE_ENV === 'development') {
      this.queue.forEach((c) =>
        console.log(
          `${c.fsrs.due < new Date() ? 'overdue\t' : 'not overdue\t'} ${c.word.headword} ${STATE_MAP[c.fsrs.state]}\t lastRating: ${
            c.fsrs.lastRating ?? 'null'
          }`
        )
      );
    }
  }

  public get queue(): readonly CardDetail[] {
    return this._queue;
  }

  private set queue(newQueue: CardDetail[]) {
    this._queue = newQueue;
    this.logQueue();
  }

  public updateQueue(newCard: CardDetail): void {
    const index = this.queue.findIndex((c) => c.userCardId === newCard.userCardId);
    if (index !== -1) {
      const newQueue = [...this.queue];
      newQueue[index] = newCard;
      this.queue = newQueue.sort((a, b) => this.compareCards(a, b));
    }
  }

  public updateUserCardId(wordId: number, userCardId: number): void {
    const card = this._queue.find((c) => c.word.wordId === wordId && c.userCardId === null);
    if (card) {
      card.userCardId = userCardId;
    }
  }

  public get hasCards() {
    return this.queue.length > 0;
  }

  public get currentCard() {
    if (!this.hasCards) {
      throw new Error('No cards available in queue');
    }
    return this.queue[0];
  }

  public get isCompleted() {
    return (
      this.hasCards &&
      this.queue.every(
        (card) => card.fsrs.state === State.Review && card.fsrs.due > new Date()
      )
    );
  }

  public get iPreview() {
    return this.f.repeat(this.currentCard.fsrs, new Date());
  }

  public get stateCounts() {
    const now = new Date();
    const reviewCounts = this.queue.filter(
      (card) => card.fsrs.state === State.Review && card.fsrs.due >= now
    ).length;
    const learningCounts = this.queue.filter(
      (card) => card.fsrs.state === State.Learning || card.fsrs.state === State.Relearning
    ).length;
    const overdueCounts = this.queue.filter(
      (card) => card.fsrs.state === State.Review && card.fsrs.due < now
    ).length;
    const newCounts = this.queue.filter((card) => card.fsrs.state === State.New).length;

    return {
      reviewCounts,
      learningCounts,
      overdueCounts,
      newCounts
    } as StateCounts;
  }

  private stateFilter(s: State) {
    if (s === State.Relearning) return State.Learning;
    return s;
  }

  // sort를 위한 비교 함수
  private compareCards(a: CardDetail, b: CardDetail) {
    // overDue 여부로 정렬
    const now = new Date();
    const aIsOverdue = a.fsrs.due < now;
    const bIsOverdue = b.fsrs.due < now;
    if (aIsOverdue !== bIsOverdue) return aIsOverdue ? -1 : 1;

    // state(New < Review < Learning = Relearning)로 정렬
    const aState = this.stateFilter(a.fsrs.state);
    const bState = this.stateFilter(b.fsrs.state);
    if (aState !== bState) return aState - bState;

    // lastRating(최근 평가 시간)로 정렬
    return (a.fsrs.lastRating ?? now).getTime() - (b.fsrs.lastRating ?? now).getTime();
  }

  public repeat(rating: Rating) {
    this.backupQueue = [...this.queue];
    // 새로운 카드 상태 계산
    const newIPreview = this.iPreview;
    const newRecordLogItem = newIPreview[rating as Grade];

    const newFsrs = {
      ...newRecordLogItem.card,
      lastRating: new Date()
    };

    const newCard = { ...this.currentCard, fsrs: newFsrs };
    this.updateQueue(newCard);

    return newCard;
  }

  public revert() {
    this.queue = this.backupQueue;
    this.backupQueue = [];
  }
}
