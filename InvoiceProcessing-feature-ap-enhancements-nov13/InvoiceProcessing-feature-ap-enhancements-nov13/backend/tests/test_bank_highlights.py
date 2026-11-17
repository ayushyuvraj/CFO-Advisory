"""Bank evidence locations: label/value OCR rows, same-page accounts and safety."""
import pymupdf
from app.services import locate, scan_locations
from app.services.bank_locations import value_rects


def characters(text, x=10, y=20, width=4):
    return [(char, .99, [x+i*width, y, x+(i+1)*width, y+10]) for i,char in enumerate(text)]


def test_bank_name_inside_labelled_line_has_only_value_box():
    text='Bank: STANDARD CHARTERED BANK (T) LTD'
    found=value_rects(characters(text), 'STANDARD CHARTERED BANK (T) LTD')
    assert len(found)==1
    assert found[0].x0==10+len('Bank: ')*4


def test_account_number_is_not_label_or_currency_and_preserves_zeros():
    chars=characters('A/C: 0000123456 (TZS)')
    hit=value_rects(chars, '0000123456', identifier=True)
    assert len(hit)==1
    assert hit[0].x0==30 and hit[0].x1==70
    assert not value_rects(chars, '123456', identifier=True)  # partial identifier
    assert not value_rects(chars, '0000123457', identifier=True)  # never fix a digit


def test_case_spacing_and_punctuation_do_not_block_exact_characters():
    assert value_rects(characters('BRANCH: IHP,DAR ES SALAAM'), 'IHP, DAR ES SALAAM')
    assert value_rects(characters('SWIFT CODE: SCBLTZTXXXX'), 'SCBLTZTXXXX', identifier=True)


def test_three_accounts_resolve_their_own_currency_and_branch(tmp_path, monkeypatch):
    path=tmp_path/'banks.pdf'
    with pymupdf.open() as pdf:
        pdf.new_page(width=600,height=800)
        pdf.save(path)
    rows=[]
    texts={}
    def row(text,x,y):
        box=[x,y,x+len(text)*4,y+10]
        rows.append((text,.99,box))
        texts[tuple(box)]=characters(text,x,y)
    fields=[]
    for n,x in ((1,10),(2,210),(3,410)):
        row(f'Bank: Example {n}',x,100)
        row(f'A/C: 00000{n} (TZS)',x,120)
        row('BRANCH: Corporate',x,140)
        for name,value in (('bank_name',f'Example {n}'),('account_number',f'00000{n}'),('currency','TZS'),('branch','Corporate')):
            fields.append(dict(key=f'bank.{n}.{name}',value=value,page=1,bbox=None))
    monkeypatch.setattr(scan_locations,'read_page',lambda page:rows)
    monkeypatch.setattr(scan_locations,'read_row_characters',lambda page,box:texts[tuple(box)])
    found,_=locate.snap(str(path),fields,[])
    assert all(found[f['key']][1] for f in fields)
    for n in (1,2,3):
        account=found[f'bank.{n}.account_number'][1]
        currency=found[f'bank.{n}.currency'][1]
        branch=found[f'bank.{n}.branch'][1]
        assert abs(account[1]-currency[1])<.01
        assert abs(account[0]-branch[0])<.1
        assert int(account[0]*600)//200==n-1


def test_ambiguous_bank_value_without_an_account_anchor_is_unavailable(tmp_path,monkeypatch):
    path=tmp_path/'blank.pdf'
    with pymupdf.open() as pdf:
        pdf.new_page();pdf.save(path)
    rows=[('BRANCH: Corporate',.99,[10,10,150,20]),('BRANCH: Corporate',.99,[210,10,350,20])]
    monkeypatch.setattr(scan_locations,'read_page',lambda page:rows)
    monkeypatch.setattr(scan_locations,'read_row_characters',lambda page,box:characters('BRANCH: Corporate',box[0],box[1]))
    found,_=locate.snap(str(path),[dict(key='bank.1.branch',value='Corporate',page=1,bbox=None)],[])
    assert found['bank.1.branch'][1] is None


def test_exact_multiline_bank_name_still_matches(tmp_path,monkeypatch):
    path=tmp_path/'multiline.pdf'
    with pymupdf.open() as pdf:
        pdf.new_page();pdf.save(path)
    rows=[('Example National',.99,[10,10,120,20]),('Bank Limited',.99,[10,22,90,32])]
    monkeypatch.setattr(scan_locations,'read_page',lambda page:rows)
    found,_=locate.snap(str(path),[dict(key='bank.1.bank_name',value='Example National Bank Limited',page=1,bbox=None)],[])
    assert found['bank.1.bank_name'][1] is not None


def test_rotated_digital_bank_box_matches_rendered_page(tmp_path):
    path=tmp_path/'rotated.pdf'
    with pymupdf.open() as pdf:
        page=pdf.new_page(width=600,height=800)
        page.insert_text((50,100),'Example Bank Account 00001234')
        page.insert_text((50,150),'Additional digital invoice text to avoid the scan threshold')
        page.set_rotation(270)
        pdf.save(path)
    with pymupdf.open(path) as pdf:
        expected=locate._norm(pdf[0].search_for('00001234')[0]*pdf[0].rotation_matrix,pdf[0])
    found,_=locate.snap(str(path),[dict(key='bank.1.account_number',value='00001234',page=1,bbox=None)],[])
    assert found['bank.1.account_number'][1]==expected
