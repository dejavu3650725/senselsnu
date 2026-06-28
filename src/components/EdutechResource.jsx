import React from 'react';
import { BookOpen, ExternalLink, Star, PlayCircle, ShieldCheck, Trophy, Tag } from 'lucide-react';

const EdutechResource = () => {
  const resources = [
    {
      title: '감정 단어 사전 (무료 워크시트)',
      icon: <Star size={24} color="#ecc94b" />,
      desc: '아이들이 감정을 세분화해서 인지하도록 돕는 것은 SEL의 핵심입니다.',
      links: [
        {
          name: 'CASEL',
          desc: '세계적인 SEL 교육의 표준을 제시하는 기관입니다. 국제적인 수준의 SEL 프레임워크와 교구, 워크시트 자료를 무료로 다운로드할 수 있어 글로벌 교육 스탠다드를 참고하기 매우 좋습니다.',
          url: 'https://casel.org/',
          tags: ['교사용', '퍼블릭 링크']
        },
        {
          name: 'Yale Center for Emotional Intelligence',
          desc: '예일대 감성지능센터에서 개발한 RULER 프로그램입니다. 학생들의 감정 어휘력을 확장하는 \'감정 온도계(Mood Meter)\'의 본산이자 세계 최고 권위의 SEL 연구 기관입니다.',
          url: 'https://www.ycei.org/',
          tags: ['교사용', '퍼블릭 링크']
        },
        {
          name: '아이스크림(i-Scream)',
          desc: '국내 초/중등 교사들이 가장 많이 활용하는 대표적인 교육 플랫폼입니다. 다양한 감정 카드와 활동지 자료가 풍부합니다.',
          url: 'https://www.i-scream.co.kr/',
          tags: ['교사용', '회원가입 필요']
        },
        {
          name: '티셀파(T-cellpa)',
          desc: '천재교육에서 운영하는 교사 지원 플랫폼으로, 수준 높은 SEL 관련 멀티미디어 및 활동지 PDF를 제공합니다.',
          url: 'https://t.tsherpa.co.kr/',
          tags: ['교사용', '회원가입 필요']
        }
      ]
    },
    {
      title: '평화로운 교실 만들기 (영상 자료)',
      icon: <PlayCircle size={24} color="#e53e3e" />,
      desc: '비폭력 대화(NVC)와 갈등 해결을 다루는 시청각 자료입니다.',
      links: [
        {
          name: 'Edutopia',
          desc: '조지 루카스 교육재단에서 운영하는 세계 최고 수준의 교육 아카이브입니다. 고품질 영상이 가득합니다.',
          url: 'https://www.edutopia.org/',
          tags: ['교사용', '퍼블릭 링크']
        },
        {
          name: 'EBS 다큐프라임 / 지식채널e',
          desc: '\'학교의 눈물\', \'아이의 사생활 - 도덕성\', \'비폭력 대화\' 등 국내 학생들에게 깊은 공감을 이끌어낼 수 있는 검증된 영상 링크 모음입니다.',
          url: 'https://home.ebs.co.kr/docuprime/index',
          tags: ['학생용', '교사용', '퍼블릭 링크']
        }
      ]
    },
    {
      title: '디지털 마음 챙김 (명상 앱 추천)',
      icon: <ShieldCheck size={24} color="#48bb78" />,
      desc: '수업 전 짧은 명상은 집중력 향상에 큰 도움을 줍니다.',
      links: [
        {
          name: 'Smiling Mind',
          desc: '호주의 비영리 단체에서 만든 명상 앱으로, 전 세계 교실에서 가장 널리 쓰이는 무료 명상 프로그램 중 하나입니다.',
          url: 'https://www.smilingmind.com.au/',
          tags: ['학생용', '교사용', '무료 앱']
        },
        {
          name: '마보(Mabo) / 하루명상',
          desc: '학생들에게는 모국어로 듣는 가이드 명상이 훨씬 편안할 수 있으므로, 한국어 기반의 마음 챙김 서비스로 추천하기 좋습니다.',
          url: 'https://www.mabopractice.com/',
          tags: ['학생용', '앱 설치 필요']
        }
      ]
    },
    {
      title: '학급 보상 시스템 툴',
      icon: <Trophy size={24} color="#4a90e2" />,
      desc: '긍정적인 행동을 강화하고 학급 분위기를 띄우는 게이미피케이션 툴입니다.',
      links: [
        {
          name: '심스페이스(Seamspace)',
          desc: '국내 교육 현장에 맞춰 개발된 사회정서학습(SEL) 전문 플랫폼입니다. 학생들의 AI 마음일기와 교사 대시보드를 연동하여 학급의 정서적 흐름을 완벽하게 파악할 수 있습니다.',
          url: 'https://diary.seamspace.me/',
          tags: ['학생용', '교사용', 'AI 활용']
        },
        {
          name: '다했니? (Dahaenni)',
          desc: '최근 국내 교육 현장에서 선풍적인 인기를 끌고 있는 과제 관리 및 보상 스탬프 서비스입니다. 한국 교실 환경에 최적화되어 있습니다.',
          url: 'https://dahandin.com/login',
          tags: ['학생용', '교사용', '회원가입 필요']
        }
      ]
    }
  ];

  const getTagColor = (tag) => {
    if (tag.includes('학생용')) return { bg: '#e6fffa', text: '#319795', border: '#b2f5ea' };
    if (tag.includes('교사용')) return { bg: '#ebf8ff', text: '#3182ce', border: '#bee3f8' };
    if (tag.includes('가입') || tag.includes('설치')) return { bg: '#fff5f5', text: '#e53e3e', border: '#fed7e2' };
    return { bg: '#f7fafc', text: '#718096', border: '#e2e8f0' };
  };

  return (
    <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '16px' }}>
          <BookOpen size={28} color="var(--primary-color)" />
        </div>
        <h2 style={{ color: '#2d3748', margin: 0, fontSize: '1.8rem' }}>에듀테크 & SEL 리소스</h2>
      </div>
      <p style={{ color: '#718096', marginBottom: '32px', fontSize: '1.05rem', paddingLeft: '52px' }}>
        학생들의 사회정서학습(SEL)을 돕기 위해 수업 시간에 바로 활용할 수 있는 외부 자료와 도구들을 추천합니다.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', flex: 1, alignContent: 'start' }}>
        {resources.map((res, idx) => (
          <div key={idx} style={{ 
            padding: '24px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', 
            display: 'flex', flexDirection: 'column', transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              {res.icon}
              <h3 style={{ margin: 0, color: '#2d3748', fontSize: '1.3rem', fontWeight: 'bold' }}>{res.title}</h3>
            </div>
            <p style={{ color: '#718096', fontSize: '1.05rem', lineHeight: '1.5', margin: '0 0 20px 40px', fontWeight: '500' }}>
              {res.desc}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginLeft: '40px' }}>
              {res.links.map((link, lidx) => (
                <div key={lidx} style={{ 
                  background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: '12px', padding: '16px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                }}>
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#1a202c' }}>{link.name}</h4>
                    <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#4a5568', lineHeight: '1.5' }}>
                      {link.desc}
                    </p>
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      {link.tags.map((tag, tidx) => {
                        const style = getTagColor(tag);
                        return (
                          <span key={tidx} style={{ 
                            background: style.bg, color: style.text, border: `1px solid ${style.border}`,
                            padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', gap: '4px'
                          }}>
                            <Tag size={12} /> {tag}
                          </span>
                        );
                      })}
                    </div>
                    
                    <a 
                      href={link.url} target="_blank" rel="noreferrer"
                      style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                        padding: '10px', background: 'white', color: 'var(--primary-color)', 
                        border: '1px solid var(--primary-color)', borderRadius: '8px', 
                        fontWeight: 'bold', textDecoration: 'none', transition: 'all 0.2s' 
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary-light)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'white'; }}
                    >
                      <ExternalLink size={16} /> 바로가기
                    </a>
                  </div>
                </div>
              ))}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default EdutechResource;
