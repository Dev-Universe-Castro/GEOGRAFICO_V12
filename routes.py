import os
from flask import Flask, render_template, jsonify, request, send_file
import json
import pandas as pd
from app import app
import io

# Load crop data
def load_crop_data():
    try:
        with open('data/crop_data_static.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Arquivo crop_data_static.json não encontrado")
        return {}
    except Exception as e:
        print(f"Erro ao carregar dados: {e}")
        return {}

CROP_DATA = load_crop_data()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analysis')
def analysis():
    return render_template('analysis.html')

@app.route('/api/brazilian-states')
def get_states():
    try:
        # Brazilian states
        states = [
            {'code': 'AC', 'name': 'Acre'},
            {'code': 'AL', 'name': 'Alagoas'},
            {'code': 'AP', 'name': 'Amapá'},
            {'code': 'AM', 'name': 'Amazonas'},
            {'code': 'BA', 'name': 'Bahia'},
            {'code': 'CE', 'name': 'Ceará'},
            {'code': 'DF', 'name': 'Distrito Federal'},
            {'code': 'ES', 'name': 'Espírito Santo'},
            {'code': 'GO', 'name': 'Goiás'},
            {'code': 'MA', 'name': 'Maranhão'},
            {'code': 'MT', 'name': 'Mato Grosso'},
            {'code': 'MS', 'name': 'Mato Grosso do Sul'},
            {'code': 'MG', 'name': 'Minas Gerais'},
            {'code': 'PA', 'name': 'Pará'},
            {'code': 'PB', 'name': 'Paraíba'},
            {'code': 'PR', 'name': 'Paraná'},
            {'code': 'PE', 'name': 'Pernambuco'},
            {'code': 'PI', 'name': 'Piauí'},
            {'code': 'RJ', 'name': 'Rio de Janeiro'},
            {'code': 'RN', 'name': 'Rio Grande do Norte'},
            {'code': 'RS', 'name': 'Rio Grande do Sul'},
            {'code': 'RO', 'name': 'Rondônia'},
            {'code': 'RR', 'name': 'Roraima'},
            {'code': 'SC', 'name': 'Santa Catarina'},
            {'code': 'SP', 'name': 'São Paulo'},
            {'code': 'SE', 'name': 'Sergipe'},
            {'code': 'TO', 'name': 'Tocantins'}
        ]

        return jsonify({
            'success': True,
            'states': states
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/statistics')
def get_statistics():
    try:
        # CROP_DATA structure: {crop_name: {municipality_code: {data}}}
        total_crops = len(CROP_DATA)

        # Count unique municipalities across all crops
        all_municipalities = set()
        for crop_data in CROP_DATA.values():
            all_municipalities.update(crop_data.keys())

        total_municipalities = len(all_municipalities)

        return jsonify({
            'success': True,
            'total_crops': total_crops,
            'total_municipalities': total_municipalities
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/crops')
def get_crops():
    try:
        # CROP_DATA structure: {crop_name: {municipality_code: {data}}}
        sorted_crops = sorted(list(CROP_DATA.keys()))
        return jsonify({
            'success': True,
            'crops': sorted_crops
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/crop-data/<crop_name>')
def get_crop_data(crop_name):
    try:
        # Busca exata primeiro
        if crop_name in CROP_DATA:
            all_crop_data = CROP_DATA[crop_name]

            # Filtrar apenas municípios válidos (códigos IBGE reais de municípios)
            crop_municipalities = {}
            for municipality_code, municipality_data in all_crop_data.items():
                municipality_code_str = str(municipality_code)
                municipality_name = municipality_data.get('municipality_name', '').lower()

                # Verificar se é um código de município válido
                # Códigos de município IBGE começam com 1-5 e têm 7 dígitos
                # Excluir códigos que começam com 0 (são agregações regionais)
                if (len(municipality_code_str) == 7 and 
                    municipality_code_str.isdigit() and
                    municipality_code_str[0] in '12345' and  # Códigos reais começam com 1-5
                    municipality_data.get('municipality_name') and
                    # Excluir nomes que indicam regiões/agregações
                    not any(keyword in municipality_name for keyword in [
                        'região', 'mesorregião', 'microrregião', 'nordeste', 'norte', 'sul', 
                        'centro', 'oeste', 'leste', 'sudeste', 'noroeste', 'sudoeste',
                        'alto ', 'baixo ', 'médio ', '-grossense', 'parecis', 'araguaia',
                        'pantanal', 'cerrado', 'amazônia', 'caatinga', 'mata atlântica'
                    ]) and
                    # Excluir nomes muito genéricos ou que são claramente regiões
                    municipality_name not in [
                        'alto teles pires', 'sudeste mato-grossense', 'parecis', 'barreiras',
                        'dourados', 'norte mato-grossense', 'portal da amazônia'
                    ]):
                    crop_municipalities[municipality_code] = municipality_data

            # Debug: Encontrar o maior produtor para verificação
            if crop_municipalities:
                # Ordenar por área colhida para debug
                sorted_municipalities = sorted(crop_municipalities.items(), 
                                             key=lambda x: float(x[1].get('harvested_area', 0)), 
                                             reverse=True)
                max_municipality = sorted_municipalities[0]
                print(f"Debug - Maior produtor de {crop_name} (apenas municípios): {max_municipality[1].get('municipality_name')} ({max_municipality[1].get('state_code')}) - {max_municipality[1].get('harvested_area')} hectares")

                # Mostrar top 5 municípios para verificação
                print(f"Debug - Top 5 municípios produtores de {crop_name}:")
                for i, (code, data) in enumerate(sorted_municipalities[:5]):
                    print(f"  {i+1}. {data.get('municipality_name')} ({data.get('state_code')}): {data.get('harvested_area')} ha - Código: {code}")
            else:
                print(f"Debug - Nenhum município válido encontrado para {crop_name}")

            return jsonify({
                'success': True,
                'data': crop_municipalities
            })

        # Busca similar se não encontrar exata
        crop_name_lower = crop_name.lower()
        similar_crops = []

        for available_crop in CROP_DATA.keys():
            if crop_name_lower in available_crop.lower() or available_crop.lower() in crop_name_lower:
                similar_crops.append(available_crop)

        if similar_crops:
            # Usar a primeira cultura similar encontrada
            best_match = similar_crops[0]
            all_crop_data = CROP_DATA[best_match]

            # Filtrar apenas municípios válidos (códigos IBGE reais de municípios)
            crop_municipalities = {}
            for municipality_code, municipality_data in all_crop_data.items():
                municipality_code_str = str(municipality_code)
                municipality_name = municipality_data.get('municipality_name', '').lower()

                # Verificar se é um código de município válido
                # Códigos de município IBGE começam com 1-5 e têm 7 dígitos
                # Excluir códigos que começam com 0 (são agregações regionais)
                if (len(municipality_code_str) == 7 and 
                    municipality_code_str.isdigit() and
                    municipality_code_str[0] in '12345' and  # Códigos reais começam com 1-5
                    municipality_data.get('municipality_name') and
                    # Excluir nomes que indicam regiões/agregações
                    not any(keyword in municipality_name for keyword in [
                        'região', 'mesorregião', 'microrregião', 'nordeste', 'norte', 'sul', 
                        'centro', 'oeste', 'leste', 'sudeste', 'noroeste', 'sudoeste',
                        'alto ', 'baixo ', 'médio ', '-grossense', 'parecis', 'araguaia',
                        'pantanal', 'cerrado', 'amazônia', 'caatinga', 'mata atlântica'
                    ]) and
                    # Excluir nomes muito genéricos ou que são claramente regiões
                    municipality_name not in [
                        'alto teles pires', 'sudeste mato-grossense', 'parecis', 'barreiras',
                        'dourados', 'norte mato-grossense', 'portal da amazônia'
                    ]):
                    crop_municipalities[municipality_code] = municipality_data

            # Debug: Encontrar o maior produtor para verificação
            if crop_municipalities:
                # Ordenar por área colhida para debug
                sorted_municipalities = sorted(crop_municipalities.items(), 
                                             key=lambda x: float(x[1].get('harvested_area', 0)), 
                                             reverse=True)
                max_municipality = sorted_municipalities[0]
                print(f"Debug - Maior produtor de {best_match} (apenas municípios): {max_municipality[1].get('municipality_name')} ({max_municipality[1].get('state_code')}) - {max_municipality[1].get('harvested_area')} hectares")

                # Mostrar top 5 municípios para verificação
                print(f"Debug - Top 5 municípios produtores de {best_match}:")
                for i, (code, data) in enumerate(sorted_municipalities[:5]):
                    print(f"  {i+1}. {data.get('municipality_name')} ({data.get('state_code')}): {data.get('harvested_area')} ha - Código: {code}")
            else:
                print(f"Debug - Nenhum município válido encontrado para {best_match}")

            return jsonify({
                'success': True,
                'data': crop_municipalities,
                'matched_crop': best_match
            })

        return jsonify({'success': False, 'error': 'Cultura não encontrada'})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/crop-chart-data/<crop_name>')
def get_crop_chart_data(crop_name):
    try:
        if crop_name not in CROP_DATA:
            return jsonify({'success': False, 'error': 'Cultura não encontrada'})

        crop_municipalities = []
        for municipality_code, municipality_data in CROP_DATA[crop_name].items():
            # Filtrar apenas municípios válidos (códigos IBGE reais de municípios)
            municipality_code_str = str(municipality_code)
            municipality_name = municipality_data.get('municipality_name', '').lower()

            # Verificar se é um código de município válido
            # Códigos de município IBGE começam com 1-5 e têm 7 dígitos
            # Excluir códigos que começam com 0 (são agregações regionais)
            if (len(municipality_code_str) == 7 and 
                municipality_code_str.isdigit() and
                municipality_code_str[0] in '12345' and  # Códigos reais começam com 1-5
                municipality_data.get('municipality_name') and
                # Excluir nomes que indicam regiões/agregações
                not any(keyword in municipality_name for keyword in [
                    'região', 'mesorregião', 'microrregião', 'nordeste', 'norte', 'sul', 
                    'centro', 'oeste', 'leste', 'sudeste', 'noroeste', 'sudoeste',
                    'alto ', 'baixo ', 'médio ', '-grossense', 'parecis', 'araguaia',
                    'pantanal', 'cerrado', 'amazônia', 'caatinga', 'mata atlântica'
                ]) and
                # Excluir nomes muito genéricos ou que são claramente regiões
                municipality_name not in [
                    'alto teles pires', 'sudeste mato-grossense', 'parecis', 'barreiras',
                    'dourados', 'norte mato-grossense', 'portal da amazônia'
                ]):
                crop_municipalities.append({
                    'municipality_name': municipality_data.get('municipality_name', 'Desconhecido'),
                    'state_code': municipality_data.get('state_code', 'XX'),
                    'harvested_area': municipality_data.get('harvested_area', 0)
                })

        # Sort by harvested area and take top 20
        crop_municipalities.sort(key=lambda x: x['harvested_area'], reverse=True)
        top_20 = crop_municipalities[:20]

        chart_data = {
            'labels': [f"{muni['municipality_name']} ({muni['state_code']})" for muni in top_20],
            'data': [muni['harvested_area'] for muni in top_20]
        }

        return jsonify({
            'success': True,
            'chart_data': chart_data
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/analysis/statistical-summary/<crop_name>')
def get_statistical_summary(crop_name):
    try:
        if crop_name not in CROP_DATA:
            return jsonify({'success': False, 'error': 'Cultura não encontrada'})

        # Filtrar apenas municípios válidos (códigos IBGE reais de municípios)
        values = []
        for municipality_code, data in CROP_DATA[crop_name].items():
            municipality_code_str = str(municipality_code)
            municipality_name = data.get('municipality_name', '').lower()

            # Verificar se é um código de município válido
            # Códigos de município IBGE começam com 1-5 e têm 7 dígitos
            # Excluir códigos que começam com 0 (são agregações regionais)
            if (len(municipality_code_str) == 7 and 
                municipality_code_str.isdigit() and
                municipality_code_str[0] in '12345' and  # Códigos reais começam com 1-5
                data.get('municipality_name') and
                # Excluir nomes que indicam regiões/agregações
                not any(keyword in municipality_name for keyword in [
                    'região', 'mesorregião', 'microrregião', 'nordeste', 'norte', 'sul', 
                    'centro', 'oeste', 'leste', 'sudeste', 'noroeste', 'sudoeste',
                    'alto ', 'baixo ', 'médio ', '-grossense', 'parecis', 'araguaia',
                    'pantanal', 'cerrado', 'amazônia', 'caatinga', 'mata atlântica'
                ]) and
                # Excluir nomes muito genéricos ou que são claramente regiões
                municipality_name not in [
                    'alto teles pires', 'sudeste mato-grossense', 'parecis', 'barreiras',
                    'dourados', 'norte mato-grossense', 'portal da amazônia'
                ]):
                values.append(data['harvested_area'])

        if not values:
            return jsonify({'success': False, 'error': 'Nenhum município válido encontrado para esta cultura'})

        import statistics
        summary = {
            'mean': statistics.mean(values),
            'median': statistics.median(values),
            'mode': statistics.mode(values) if len(set(values)) < len(values) else None,
            'std_dev': statistics.stdev(values) if len(values) > 1 else 0,
            'min': min(values),
            'max': max(values),
            'q1': statistics.quantiles(values, n=4)[0] if len(values) >= 4 else None,
            'q3': statistics.quantiles(values, n=4)[2] if len(values) >= 4 else None,
            'total': sum(values),
            'count': len(values)
        }

        return jsonify({
            'success': True,
            'summary': summary
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/analysis/by-state/<crop_name>')
def get_analysis_by_state(crop_name):
    try:
        if crop_name not in CROP_DATA:
            return jsonify({'success': False, 'error': 'Cultura não encontrada'})

        states_data = {}
        for municipality_code, municipality_data in CROP_DATA[crop_name].items():
            # Filtrar apenas municípios válidos (códigos IBGE reais de municípios)
            municipality_code_str = str(municipality_code)
            municipality_name = municipality_data.get('municipality_name', '').lower()

            # Verificar se é um código de município válido
            # Códigos de município IBGE começam com 1-5 e têm 7 dígitos
            # Excluir códigos que começam com 0 (são agregações regionais)
            if (len(municipality_code_str) == 7 and 
                municipality_code_str.isdigit() and
                municipality_code_str[0] in '12345' and  # Códigos reais começam com 1-5
                municipality_data.get('municipality_name') and
                # Excluir nomes que indicam regiões/agregações
                not any(keyword in municipality_name for keyword in [
                    'região', 'mesorregião', 'microrregião', 'nordeste', 'norte', 'sul', 
                    'centro', 'oeste', 'leste', 'sudeste', 'noroeste', 'sudoeste',
                    'alto ', 'baixo ', 'médio ', '-grossense', 'parecis', 'araguaia',
                    'pantanal', 'cerrado', 'amazônia', 'caatinga', 'mata atlântica'
                ]) and
                # Excluir nomes muito genéricos ou que são claramente regiões
                municipality_name not in [
                    'alto teles pires', 'sudeste mato-grossense', 'parecis', 'barreiras',
                    'dourados', 'norte mato-grossense', 'portal da amazônia'
                ]):

                state = municipality_data.get('state_code', 'XX')
                area = municipality_data.get('harvested_area', 0)

                if state not in states_data:
                    states_data[state] = {
                        'total_area': 0,
                        'municipalities_count': 0,
                        'max_area': 0,
                        'municipalities': []
                    }

                states_data[state]['total_area'] += area
                states_data[state]['municipalities_count'] += 1
                states_data[state]['max_area'] = max(states_data[state]['max_area'], area)
                states_data[state]['municipalities'].append({
                    'name': municipality_data.get('municipality_name'),
                    'area': area
                })

        # Calculate averages
        for state_data in states_data.values():
            state_data['average_area'] = state_data['total_area'] / state_data['municipalities_count']

        return jsonify({
            'success': True,
            'states_data': states_data
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/analysis/comparison/<crop1>/<crop2>')
def get_crop_comparison(crop1, crop2):
    try:
        if crop1 not in CROP_DATA or crop2 not in CROP_DATA:
            return jsonify({'success': False, 'error': 'Uma ou ambas culturas não encontradas'})

        # Get common municipalities
        common_municipalities = set(CROP_DATA[crop1].keys()) & set(CROP_DATA[crop2].keys())

        comparison_data = []
        for muni_code in common_municipalities:
            data1 = CROP_DATA[crop1][muni_code]
            data2 = CROP_DATA[crop2][muni_code]

            comparison_data.append({
                'municipality_code': muni_code,
                'municipality_name': data1.get('municipality_name'),
                'state_code': data1.get('state_code'),
                'crop1_area': data1.get('harvested_area', 0),
                'crop2_area': data2.get('harvested_area', 0),
                'ratio': data1.get('harvested_area', 0) / max(data2.get('harvested_area', 1), 1)
            })

        return jsonify({
            'success': True,
            'crop1': crop1,
            'crop2': crop2,
            'comparison_data': comparison_data,
            'common_municipalities': len(common_municipalities)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/export/complete-data')
def export_complete_data():
    """Export complete crop data as Excel file"""
    try:
        # Load the original Excel file
        excel_path = os.path.join('data', 'ibge_2023_hectares_colhidos.xlsx')

        if not os.path.exists(excel_path):
            # Try alternative path
            excel_path = os.path.join('attached_assets', 'IBGE - 2023 - BRASIL HECTARES COLHIDOS_1752980032040.xlsx')

        if not os.path.exists(excel_path):
            return jsonify({'success': False, 'error': 'Arquivo de dados não encontrado'}), 404

        # Read the Excel file
        df = pd.read_excel(excel_path)

        # Create a BytesIO object to store the Excel file
        output = io.BytesIO()

        # Write to Excel
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Culturas IBGE 2023', index=False)

        output.seek(0)

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='base_completa_culturas_ibge_2023.xlsx'
        )

    except Exception as e:
        print(f"Erro ao exportar dados: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/export/crop-analysis/<crop_name>')
def export_crop_analysis(crop_name):
    """Export crop analysis data as Excel file"""
    try:
        # Obter parâmetro de estado opcional
        state_filter = request.args.get('state')
        
        if crop_name not in CROP_DATA:
            return jsonify({'success': False, 'error': 'Cultura não encontrada'}), 404

        # Preparar dados para exportação
        analysis_data = []
        for municipality_code, municipality_data in CROP_DATA[crop_name].items():
            # Filtrar apenas municípios válidos
            municipality_code_str = str(municipality_code)
            municipality_name = municipality_data.get('municipality_name', '').lower()

            if (len(municipality_code_str) == 7 and 
                municipality_code_str.isdigit() and
                municipality_code_str[0] in '12345' and
                municipality_data.get('municipality_name') and
                not any(keyword in municipality_name for keyword in [
                    'região', 'mesorregião', 'microrregião', 'nordeste', 'norte', 'sul', 
                    'centro', 'oeste', 'leste', 'sudeste', 'noroeste', 'sudoeste',
                    'alto ', 'baixo ', 'médio ', '-grossense', 'parecis', 'araguaia',
                    'pantanal', 'cerrado', 'amazônia', 'caatinga', 'mata atlântica'
                ]) and
                municipality_name not in [
                    'alto teles pires', 'sudeste mato-grossense', 'parecis', 'barreiras',
                    'dourados', 'norte mato-grossense', 'portal da amazônia'
                ]):
                
                # Aplicar filtro de estado se especificado
                if state_filter and municipality_data.get('state_code') != state_filter:
                    continue
                
                analysis_data.append({
                    'Código IBGE': municipality_code,
                    'Município': municipality_data.get('municipality_name', 'Desconhecido'),
                    'UF': municipality_data.get('state_code', 'XX'),
                    'Cultura': crop_name,
                    'Área Colhida (hectares)': municipality_data.get('harvested_area', 0),
                    'Ano': 2023
                })

        # Ordenar por área colhida (maior para menor)
        analysis_data.sort(key=lambda x: x['Área Colhida (hectares)'], reverse=True)

        # Criar DataFrame
        df = pd.DataFrame(analysis_data)

        # Calcular estatísticas resumidas
        total_area = df['Área Colhida (hectares)'].sum()
        total_municipalities = len(df)
        average_area = df['Área Colhida (hectares)'].mean()
        max_area = df['Área Colhida (hectares)'].max()
        min_area = df['Área Colhida (hectares)'].min()

        # Criar dados de resumo estatístico
        summary_data = [
            ['Estatística', 'Valor'],
            ['Cultura Analisada', crop_name],
            ['Filtro de Estado', state_filter if state_filter else 'Nacional (Todos os Estados)'],
            ['Ano de Referência', 2023],
            ['Total de Municípios', total_municipalities],
            ['Área Total Colhida (ha)', f'{total_area:,.2f}'],
            ['Área Média por Município (ha)', f'{average_area:,.2f}'],
            ['Maior Área Municipal (ha)', f'{max_area:,.2f}'],
            ['Menor Área Municipal (ha)', f'{min_area:,.2f}'],
            ['Data da Exportação', pd.Timestamp.now().strftime('%d/%m/%Y %H:%M:%S')]
        ]

        # Criar resumo por estado
        state_summary = df.groupby('UF').agg({
            'Área Colhida (hectares)': ['sum', 'count', 'mean']
        }).round(2)
        state_summary.columns = ['Área Total (ha)', 'Nº Municípios', 'Área Média (ha)']
        state_summary = state_summary.sort_values('Área Total (ha)', ascending=False)
        state_summary.reset_index(inplace=True)

        # Criar arquivo Excel
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Planilha principal com dados detalhados
            df.to_excel(writer, sheet_name='Dados Detalhados', index=False)
            
            # Planilha de resumo estatístico
            summary_df = pd.DataFrame(summary_data[1:], columns=summary_data[0])
            summary_df.to_excel(writer, sheet_name='Resumo Estatístico', index=False)
            
            # Planilha de resumo por estado
            state_summary.to_excel(writer, sheet_name='Resumo por Estado', index=False)
            
            # Top 20 maiores produtores
            top_20 = df.head(20).copy()
            top_20['Ranking'] = range(1, len(top_20) + 1)
            top_20 = top_20[['Ranking', 'Município', 'UF', 'Área Colhida (hectares)']]
            top_20.to_excel(writer, sheet_name='Top 20 Produtores', index=False)

        output.seek(0)

        # Nome do arquivo
        safe_crop_name = crop_name.replace('/', '_').replace('\\', '_').replace(':', '_')
        state_suffix = f'_{state_filter}' if state_filter else '_Nacional'
        filename = f'analise_{safe_crop_name}{state_suffix}_{pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")}.xlsx'

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        print(f"Erro ao exportar análise: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)