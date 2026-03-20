#!/usr/bin/env python3
"""CSV -> D1 SQL 시딩 스크립트

Usage:
  python scripts/seed-csv-to-sql.py
  wrangler d1 execute hada-db --local --file=scripts/seed-words.sql
  wrangler d1 execute hada-db --local --file=scripts/seed-translations.sql
"""

import csv
import json
import os
from collections import defaultdict

LEVEL_MAP = {'초급': 'easy', '중급': 'normal', '고급': 'hard'}

LANG_COLUMNS = {
    'en': ('영어 대역어', '영어 대역어 뜻풀이'),
    'ja': ('일본어 대역어', '일본어 대역어 뜻풀이'),
    'zh': ('중국어 대역어', '중국어 대역어 뜻풀이'),
    'vi': ('베트남어 대역어', '베트남어 대역어 뜻풀이'),
    'th': ('타이어 대역어', '타이어 대역어 뜻풀이'),
    'id': ('인도네시아어 대역어', '인도네시아어 대역어 뜻풀이'),
    'ru': ('러시아어 대역어', '러시아어 대역어 뜻풀이'),
    'fr': ('프랑스어 대역어', '프랑스어 대역어 뜻풀이'),
    'es': ('스페인어 대역어', '스페인어 대역어 뜻풀이'),
    'mn': ('몽골어 대역어', '몽골어 대역어 뜻풀이'),
    'ar': ('아랍어 대역어', '아랍어 대역어 뜻풀이'),
}

BATCH_SIZE = 50


def sql_escape(s):
    """SQL 문자열 이스케이프. None이면 NULL 반환."""
    if s is None:
        return 'NULL'
    return "'" + s.replace("'", "''") + "'"


def to_json(values):
    """리스트를 JSON 문자열로 변환."""
    return json.dumps(values, ensure_ascii=False)


def write_batched_inserts(f, table, columns, rows, batch_size):
    """INSERT 문을 batch_size 단위로 나눠서 작성."""
    cols = ', '.join(columns)
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        f.write(f'INSERT INTO {table} ({cols}) VALUES\n')
        f.write(',\n'.join(batch))
        f.write(';\n\n')


def main():
    csv_path = os.path.join(os.path.dirname(__file__), '..', 'korean-words.csv')
    out_dir = os.path.dirname(__file__)

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))

    print(f'CSV 로드: {len(rows)}행')

    # (표제어, 동형어번호) 기준 그룹핑
    groups = defaultdict(list)
    for r in rows:
        key = (r['표제어'], r['동형어 번호'])
        groups[key].append(r)

    print(f'고유 단어(동형어 단위): {len(groups)}개')

    words_values = []
    trans_values = []
    word_id = 1

    for (headword, homo_num), sense_rows in groups.items():
        first = sense_rows[0]

        # --- words ---
        definitions = [r['뜻풀이'].strip() for r in sense_rows]
        examples = [r['용례'].strip() for r in sense_rows]

        level = LEVEL_MAP.get(first['어휘 등급'].strip(), 'hard')
        is_native = 1 if first['고유어 여부'].strip() == '고유어' else 0

        topics_raw = first['주제 및 상황 범주'].strip()
        topics = [t.strip() for t in topics_raw.split('\n') if t.strip()] if topics_raw else []

        freq_str = first['빈도'].strip()
        try:
            frequency = str(float(freq_str)) if freq_str else 'NULL'
        except ValueError:
            frequency = 'NULL'

        words_values.append(
            f"({word_id}, {sql_escape(headword)}, {int(homo_num) if homo_num.isdigit() else 0}, "
            f"{sql_escape(first['품사'].strip() or None)}, {is_native}, "
            f"{sql_escape(first['원어'].strip() or None)}, "
            f"{sql_escape(first['발음'].strip() or None)}, "
            f"'{level}', {frequency}, "
            f"{sql_escape(first['의미 범주'].strip() or None)}, "
            f"{sql_escape(to_json(topics))}, "
            f"{sql_escape(to_json(definitions))}, "
            f"{sql_escape(to_json(examples))}, "
            f"{sql_escape(first['활용'].strip() or None)}, "
            f"{sql_escape(first['파생어'].strip() or None)})"
        )

        # --- translations ---
        for lang_code, (trans_col, def_col) in LANG_COLUMNS.items():
            translations = [r.get(trans_col, '').strip() for r in sense_rows]
            definitions_tr = [r.get(def_col, '').strip() for r in sense_rows]

            # 번역이 하나도 없으면 스킵
            if not any(translations):
                continue

            trans_values.append(
                f"({word_id}, '{lang_code}', "
                f"{sql_escape(to_json(translations))}, "
                f"{sql_escape(to_json(definitions_tr))})"
            )

        word_id += 1

    # --- SQL 파일 생성 ---
    words_path = os.path.join(out_dir, 'seed-words.sql')
    with open(words_path, 'w', encoding='utf-8') as f:
        f.write('DELETE FROM translations;\n')
        f.write('DELETE FROM words;\n\n')
        write_batched_inserts(
            f, 'words',
            ['id', 'headword', 'homograph_number', 'part_of_speech', 'is_native',
             'origin', 'pronunciation', 'level', 'frequency', 'meaning_category',
             'topics', 'definition', 'examples', 'conjugation', 'derivative'],
            words_values, BATCH_SIZE,
        )

    trans_path = os.path.join(out_dir, 'seed-translations.sql')
    with open(trans_path, 'w', encoding='utf-8') as f:
        write_batched_inserts(
            f, 'translations',
            ['word_id', 'lang_code', 'translation', 'definition'],
            trans_values, BATCH_SIZE,
        )

    print(f'words: {len(words_values)}행 -> {words_path}')
    print(f'translations: {len(trans_values)}행 -> {trans_path}')
    print('완료!')


if __name__ == '__main__':
    main()
